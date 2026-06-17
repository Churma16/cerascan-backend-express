import {getRabbitChannel} from '../config/rabbitmq_client';
import axios from 'axios';
import fs from 'fs';
import {Scan} from "../models";
import {getSocket} from "../config/websocket_client";
import {LeaderboardService} from "../modules/leaderboard/leaderboard.service";
import {RabbitMQService} from "../modules/rabbitmq/rabbitmq.service";

export class AiScanSubscriber {
    private static readonly MAX_RETRIES = 3;
    private static retryMap = new Map<string, number>();

    static async start(): Promise<void> {
        const channel = getRabbitChannel();
        const QUEUE_NAME = 'ai_scan_worker_queue';

        try {
            await channel.deleteQueue(QUEUE_NAME);
            console.log(`[AI Worker] Queue lama '${QUEUE_NAME}' dihapus`);
        } catch (err) {
            // Queue mungkin tidak ada
        }

        await channel.assertQueue(QUEUE_NAME, {
            durable: true,
            arguments: {
                'x-dead-letter-exchange': RabbitMQService.getDLXExchangeName()
            }
        });
        await channel.bindQueue(QUEUE_NAME, 'cerascan_events', 'scan.process');

        // prefetch(1) artinya pekerja Node.js ini cuma boleh nembak Python 1 kali per waktu
        // Biar server Python Anda tidak meledak kalau ada 50 gambar
        channel.prefetch(1);

        channel.consume(QUEUE_NAME, async (msg: any) => {
            if (msg) {
                const startTime = Date.now();
                let taskData;

                try {
                    taskData = JSON.parse(msg.content.toString());
                    const messageId = `${taskData.db_id}`;

                    const fileBuffer = fs.readFileSync(taskData.file_path);
                    const blob = new Blob([fileBuffer], {type: 'image/jpeg'});
                    const formData = new FormData();
                    formData.append('file', blob, taskData.original_name);


                    const microserviceUrl = process.env.MICROSERVICES_URL || 'http://127.0.0.1:8000';
                    const pythonResponse = await axios.post(microserviceUrl + '/predict', formData, {
                        headers: {'Content-Type': 'multipart/form-data'},
                    });

                    const result = pythonResponse.data;
                    const inferenceTimeMs = Date.now() - startTime;

                    // 3. UPDATE DATABASE POSTGRESQL
                    await Scan.update({
                        prediction: result.prediction,
                        confidence: result.confidence_score,
                        inference_time: `${inferenceTimeMs}ms`,
                        user_id: taskData.user_id,
                    }, {
                        where: {id: taskData.db_id}
                    });

                    if (taskData.user_id && result.prediction) {
                        await LeaderboardService.recordCompletedScan(taskData.user_id, result.prediction);
                    }

                    // PERBAIKAN 2: Panggil getSocket() untuk mendapatkan instance io
                    const io = getSocket();
                    io.emit('scan_completed', {
                        db_id: taskData.db_id,
                        scan_id: taskData.scan_id,
                        prediction: result.prediction,
                        confidence: result.confidence_score,
                        inference_time: `${inferenceTimeMs}ms`
                    });

                    console.log(`✅ [AI Worker] Selesai Scan ${taskData.scan_id}. Hasil: ${result.prediction}`);

                    // 4. HAPUS FILE SETELAH SUKSES (Dikomentari agar gambar tetap disimpan)
                    // if (fs.existsSync(taskData.file_path)) fs.unlinkSync(taskData.file_path);

                    // 5. BERITAHU RABBITMQ TUGAS SELESAI
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
                    } catch (e) {}

                    const retryCount = AiScanSubscriber.retryMap.get(messageId) || 0;
                    console.error(`❌ [AI Worker] Gagal proses API Python (Retry ${retryCount}/${AiScanSubscriber.MAX_RETRIES}):`, error.message);

                    if (retryCount < AiScanSubscriber.MAX_RETRIES) {
                        AiScanSubscriber.retryMap.set(messageId, retryCount + 1);
                        channel.nack(msg, false, true); // Requeue
                        console.log(`[AI Worker] Pesan di-requeue untuk retry (${retryCount + 1}/${AiScanSubscriber.MAX_RETRIES})`);
                    } else {
                        channel.nack(msg, false, false); // Buang / Kirim ke DLX
                        console.error(`❌ [AI Worker] Gagal setelah ${AiScanSubscriber.MAX_RETRIES} retry, dikirim ke DLX`);
                        AiScanSubscriber.retryMap.delete(messageId);
                    }
                }
            }
        });
    }
}