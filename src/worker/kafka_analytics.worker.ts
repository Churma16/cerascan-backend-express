import {AnalyticsModel} from '../models/analytics.model';
import {UserDailyKpiModel} from '../models/user_daily_kpi.model'; // Import model baru
import dayjs from 'dayjs';
import {kafka} from "../config/kafka.client";
import {getRedisClient} from "../config/redis_client";

const consumer = kafka.consumer({groupId: 'ceramic-analytics-group'});
const TOPIC_NAME = 'ceramic-scan-completed';

export const startAnalyticsConsumer = async (): Promise<void> => {
    try {
        await consumer.connect();
        console.log(' Kafka Consumer  Berhasil terhubung');

        await consumer.subscribe({topic: TOPIC_NAME, fromBeginning: false});
        console.log(` Kafka Consumer  Mendengarkan topik: ${TOPIC_NAME}`);

        await consumer.run({
            eachMessage: async ({message}) => {
                try {
                    const messageVal = message.value?.toString();
                    if (!messageVal) return;

                    const payload = JSON.parse(messageVal);
                    console.log(`[Kafka Consumer] Memproses analitik scan_id: ${payload.scan_id}`);

                    // 1. Simpan Data Mentah (Audit Log)
                    const analyticsData = new AnalyticsModel({
                        scan_id: payload.scan_id,
                        user_id: payload.user_id,
                        prediction: payload.prediction,
                        confidence_score: payload.confidence_score,
                        inference_time: payload.inference_time
                    });
                    await analyticsData.save();

                    // 2. Lakukan Agregasi Increment (CQRS / Materialized View)
                    const todayDateStr = dayjs().format('YYYY-MM-DD'); // Dapatkan format "YYYY-MM-DD"
                    const userId = payload.user_id || 0; // Jika guest, anggap ID-nya 0

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
                        console.error('[Kafka Consumer] Gagal menghapus cache Redis:', redisErr.message);
                    }
                } catch (err: any) {
                    console.error('[Kafka Consumer] Gagal memproses pesan analitik:', err.message);
                    throw err;
                }
            },
        });
    } catch (error) {
        console.error(' Kafka Consumer  Gagal menjalankan consumer:', error);
    }
};