import {getRabbitChannel} from '../config/rabbitmq_client';
import { RecordCompletedScanUseCase } from "../modules/leaderboard/use-cases/RecordCompletedScanUseCase";
import {RabbitMQClient} from "../modules/rabbitmq/infrastructure/rabbitmq.client";
import { PythonMlClient } from "../modules/scan/infrastructure/python_ml_client";
import { UpdateScanSuccessUseCase } from "../modules/scan/use-cases/UpdateScanSuccessUseCase";
import { UpdateScanFailedUseCase } from "../modules/scan/use-cases/UpdateScanFailedUseCase";
import { EmitScanCompletedUseCase } from "../modules/notification/use-cases/EmitScanCompletedUseCase";
import { EmitScanFailedUseCase } from "../modules/notification/use-cases/EmitScanFailedUseCase";
import {RabbitMQHelper} from "../modules/rabbitmq/rabbitmq.helper";

export class AiScanSubscriber {
    private static readonly MAX_RETRIES = 3;
    private static retryMap = new Map<string, number>();

    static async start(): Promise<void> {
        const channel = getRabbitChannel();
        const QUEUE_NAME = 'ai_scan_worker_queue';

        // 1. Setup Queue menggunakan helper
        await RabbitMQHelper.setupQueueWithDLX(
            channel,
            QUEUE_NAME,
            'cerascan_events',
            'scan.process',
            RabbitMQClient.getDLXExchangeName()
        );

        // sent one file each
        channel.prefetch(1);

        channel.consume(QUEUE_NAME, async (msg: any) => {
            if (msg) {
                const startTime = Date.now();
                let taskData;

                try {
                    taskData = JSON.parse(msg.content.toString());
                    const messageId = `${taskData.db_id}`;

                    const result = await PythonMlClient.predictImage(taskData.file_path, taskData.original_name);
                    const inferenceTimeMs = Date.now() - startTime;

                    const updateScanSuccessUseCase = new UpdateScanSuccessUseCase();
                    await updateScanSuccessUseCase.execute(
                        taskData.db_id,
                        result.prediction,
                        result.confidence_score,
                        `${inferenceTimeMs}ms`,
                        taskData.user_id
                    );

                    if (taskData.user_id && result.prediction) {
                        const recordCompletedScanUseCase = new RecordCompletedScanUseCase();
                        await recordCompletedScanUseCase.execute(taskData.user_id, result.prediction);
                    }

                    // 4. Kirim Notifikasi menggunakan service terpisah
                    const emitScanCompletedUseCase = new EmitScanCompletedUseCase();
                    await emitScanCompletedUseCase.execute({
                        db_id: taskData.db_id,
                        scan_id: taskData.scan_id,
                        prediction: result.prediction,
                        confidence: result.confidence_score,
                        inference_time: `${inferenceTimeMs}ms`
                    });

                    console.log(`✅ [AI Worker] Selesai Scan ${taskData.scan_id}. Hasil: ${result.prediction}`);

                    channel.ack(msg);
                    AiScanSubscriber.retryMap.delete(messageId);

                } catch (error: any) {
                    let messageId = 'unknown';
                    try {
                        if (taskData) {
                            messageId = `${taskData.db_id}`;
                        } else {
                            const parsed = JSON.parse(msg.content.toString());
                            messageId = `${parsed.db_id}`;
                        }
                    } catch (e) {
                    }

                    const retryCount = AiScanSubscriber.retryMap.get(messageId) || 0;
                    console.error(
                        `[AI Worker] Gagal proses API Python (Retry ${retryCount}/${AiScanSubscriber.MAX_RETRIES}):`,
                        error.message
                    );

                    if (retryCount < AiScanSubscriber.MAX_RETRIES) {
                        AiScanSubscriber.retryMap.set(messageId, retryCount + 1);
                        channel.nack(msg, false, true);
                        console.log(`[AI Worker] Pesan di-requeue untuk retry (${retryCount + 1}/${AiScanSubscriber.MAX_RETRIES})`);
                    } else {
                        channel.nack(msg, false, false);
                        console.error(`❌ [AI Worker] Gagal setelah ${AiScanSubscriber.MAX_RETRIES} retry, dikirim ke DLX`);

                        try {
                            if (taskData && taskData.db_id) {
                                const updateScanFailedUseCase = new UpdateScanFailedUseCase();
                                await updateScanFailedUseCase.execute(taskData.db_id);
                                console.log(`[AI Worker] Status DB diubah ke 'failed' untuk ID: ${taskData.db_id}`);
                            }
                        } catch (dbErr) {
                            console.error(`[AI Worker] Gagal mengupdate status database ke failed:`, dbErr);
                        }

                        try {
                            if (taskData && taskData.scan_id) {
                                const emitScanFailedUseCase = new EmitScanFailedUseCase();
                                await emitScanFailedUseCase.execute({
                                    scan_id: taskData.scan_id,
                                    db_id: taskData.db_id,
                                    error: error.message
                                });
                            }
                        } catch (socketErr) {
                            console.error(`[AI Worker] Gagal memancarkan event socket scan_failed:`, socketErr);
                        }

                        AiScanSubscriber.retryMap.delete(messageId);
                    }
                }
            }
        });
    }
}