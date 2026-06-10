import {getRabbitChannel} from '../config/rabbitmq_client';
import axios from 'axios';
import fs from 'fs';
import {Scan} from "../models";
import {getSocket} from "../config/websocket_client";
import {LeaderboardService} from "../modules/leaderboard/leaderboard.service";

export class AiScanSubscriber {
    static async start(): Promise<void> {
        const channel = getRabbitChannel();
        const QUEUE_NAME = 'ai_scan_worker_queue';

        await channel.assertQueue(QUEUE_NAME, {durable: true});
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

                } catch (error: any) {
                    console.error(`❌ [AI Worker] Gagal proses API Python:`, error.message);

                    // Hapus file jika gagal total (Dikomentari agar gambar tetap disimpan)
                    // if (taskData && fs.existsSync(taskData.file_path)) {
                    //     fs.unlinkSync(taskData.file_path);
                    // }

                    // Beritahu RabbitMQ untuk membuang pesan ini
                    channel.nack(msg, false, false);
                }
            }
        });
    }
}