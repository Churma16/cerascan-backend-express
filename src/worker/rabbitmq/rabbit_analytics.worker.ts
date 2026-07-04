import { getRabbitChannel } from "../../config/rabbitmq_client";
import {AnalyticsModel} from '../../models/analytics.model';
import {UserDailyKpiModel} from '../../models/user_daily_kpi.model';
import dayjs from 'dayjs';
import {getRedisClient} from "../../config/redis_client";

const STREAM_NAME = 'ceramic-scan-completed-stream';

export const startRabbitAnalyticsConsumer = async (): Promise<void> => {
    try {
        const channel = getRabbitChannel();
        if (!channel) {
            console.error('[RabbitMQ Analytics Worker] Channel belum diinisialisasi.');
            return;
        }

        await channel.assertQueue(STREAM_NAME, {
            durable: true,
            arguments: { 'x-queue-type': 'stream' }
        });

        // Konsumsi stream dengan offset 'next'
        await channel.consume(STREAM_NAME, async (msg: any) => {
            if (msg) {
                try {
                    const messageVal = msg.content.toString();
                    if (!messageVal) {
                        channel.ack(msg);
                        return;
                    }

                    const payload = JSON.parse(messageVal);
                    console.log(`[RabbitMQ Analytics Worker] Memproses analitik scan_id: ${payload.scan_id}`);

                    // 1. Simpan Data Mentah (Audit Log)
                    const analyticsData = new AnalyticsModel({
                        scan_id: payload.scan_id,
                        user_id: payload.user_id,
                        prediction: payload.prediction,
                        confidence_score: payload.confidence_score,
                        inference_time: payload.inference_time
                    });
                    await analyticsData.save();

                    const todayDateStr = dayjs().format('YYYY-MM-DD');
                    const userId = payload.user_id || 0;

                    const isDefect = ['crack', 'scratch', 'stain'].includes(payload.prediction.toLowerCase());

                    // Mongoose findOneAndUpdate + $inc melakukan update angka secara atomik di database
                    await UserDailyKpiModel.findOneAndUpdate(
                        {
                            user_id: userId,
                            date: todayDateStr
                        },
                        {
                            $inc: {
                                total_scans: 1,
                                total_confidence: payload.confidence_score,
                                defect_scans: isDefect ? 1 : 0,
                                normal_scans: isDefect ? 0 : 1
                            }
                        },
                        {
                            upsert: true, // Jika data hari ini belum ada, buat baru otomatis
                            new: true     // Kembalikan data setelah ter-update
                        }
                    );

                    console.log(`[MongoDB] Data mentah & KPI Harian untuk user ${userId} hari ${todayDateStr} berhasil diupdate.`);

                    try {
                        const redis = getRedisClient();
                        if (userId !== 0) {
                            await redis.del(`dashboard:kpi:${userId}`);
                            await redis.del(`dashboard:trend:${userId}`);
                        } else {
                            await redis.del('dashboard:kpi');
                            await redis.del('dashboard:trend');
                        }
                        console.log(`[Redis] Cache dashboard untuk user ${userId} telah dibersihkan.`);
                    } catch (redisErr: any) {
                        console.error('[RabbitMQ Analytics Worker] Gagal menghapus cache Redis:', redisErr.message);
                    }
                    
                    channel.ack(msg);
                } catch (err: any) {
                    console.error('[RabbitMQ Analytics Worker] Gagal memproses pesan:', err.message);
                    channel.nack(msg, false, false); // Buang jika error untuk menghindari blocking stream
                }
            }
        }, {
            noAck: false,
            arguments: { 'x-stream-offset': 'next' }
        });

        console.log(`[RabbitMQ Analytics Worker] Berhasil terhubung dan mendengarkan stream: ${STREAM_NAME}`);
    } catch (error) {
        console.error('[RabbitMQ Analytics Worker] Gagal menjalankan consumer:', error);
    }
};
