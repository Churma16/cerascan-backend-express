import {getRabbitChannel} from '../config/rabbitmq_client';
import {LeaderboardService} from "../modules/leaderboard/leaderboard.service";
import {RabbitMQService} from "../modules/rabbitmq/rabbitmq.service";
import {ScanService} from "../modules/scan/scan.service";
import {NotificationService} from "../modules/notification/notification.service";
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
            RabbitMQService.getDLXExchangeName()
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

                    // 2. Panggil API AI menggunakan service terpisah
                    const result = await ScanService.predictImage(taskData.file_path, taskData.original_name);
                    const inferenceTimeMs = Date.now() - startTime;

                    // 3. Update Database via ScanService
                    await ScanService.updateScanSuccess(
                        taskData.db_id,
                        result.prediction,
                        result.confidence_score,
                        `${inferenceTimeMs}ms`,
                        taskData.user_id
                    );

                    if (taskData.user_id && result.prediction) {
                        await LeaderboardService.recordCompletedScan(taskData.user_id, result.prediction);
                    }

                    // 4. Kirim Notifikasi menggunakan service terpisah
                    NotificationService.emitScanCompleted({
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
                                await ScanService.UpdateScanById(taskData);
                                console.log(`[AI Worker] Status DB diubah ke 'failed' untuk ID: ${taskData.db_id}`);
                            }
                        } catch (dbErr) {
                            console.error(`[AI Worker] Gagal mengupdate status database ke failed:`, dbErr);
                        }

                        try {
                            if (taskData && taskData.scan_id) {
                                NotificationService.emitScanFailed({
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