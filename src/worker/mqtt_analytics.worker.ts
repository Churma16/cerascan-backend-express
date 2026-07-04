// File: src/worker/mqtt_analytics.worker.ts
import { getMQTTClient } from '../config/mqtt_client';
import { RecordScanHistoryUseCase } from '../modules/scan/use-cases/RecordScanHistoryUseCase';
import { UserDailyKpiModel } from '../models/user_daily_kpi.model';
import { getRedisClient } from '../config/redis_client';
import dayjs from 'dayjs';

const TOPIC_NAME = 'ceramic/defect/analytics';

export const startMQTTAnalyticsConsumer = async (): Promise<void> => {
    try {
        const client = getMQTTClient();

        // Subscribe ke topik dengan QoS 1 (At Least Once)
        client.subscribe(TOPIC_NAME, { qos: 1 }, (err) => {
            if (err) {
                console.error(`❌ [MQTT Consumer] Gagal subscribe ke topik ${TOPIC_NAME}:`, err.message);
            } else {
                console.log(`📥 [MQTT Consumer] Mendengarkan topik: ${TOPIC_NAME}`);
            }
        });

        // Mendengarkan pesan masuk
        client.on('message', async (topic, message) => {
            // Hanya proses pesan dari topik analitik kita
            if (topic !== TOPIC_NAME) return;

            try {
                const messageVal = message.toString();
                const payload = JSON.parse(messageVal);
                console.log(`📩 [MQTT Consumer] Memproses analitik scan_id: ${payload.scan_id}`);

                // 1. Simpan Data Mentah (Audit Log)
                const recordScanHistoryUseCase = new RecordScanHistoryUseCase();
                await recordScanHistoryUseCase.execute({
                    scan_id: payload.scan_id,
                    user_id: payload.user_id,
                    prediction: payload.prediction,
                    confidence_score: payload.confidence_score,
                    inference_time: payload.inference_time
                });

                // 2. Lakukan Agregasi Increment (Materialized View)
                const todayDateStr = dayjs().format('YYYY-MM-DD');
                const userId = payload.user_id || 0;

                const isDefect = ['crack', 'scratch', 'stain'].includes(payload.prediction.toLowerCase());

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
                        upsert: true,
                        returnDocument: 'after' // Menggunakan opsi terbaru Mongoose menggantikan 'new: true'
                    }
                );

                console.log(`🍃 [MongoDB] Data mentah & KPI Harian untuk user ${userId} hari ${todayDateStr} berhasil diupdate.`);

                // 3. Hapus Cache Redis agar Dashboard langsung update seketika
                try {
                    const redis = getRedisClient();
                    if (userId !== 0) {
                        await redis.del(`dashboard:kpi:${userId}`);
                        await redis.del(`dashboard:trend:${userId}`);
                    } else {
                        await redis.del('dashboard:kpi');
                        await redis.del('dashboard:trend');
                    }
                    console.log(`🧹 [Redis] Cache dashboard untuk user ${userId} telah dibersihkan.`);
                } catch (redisErr: any) {
                    console.error('⚠️ [MQTT Consumer] Gagal menghapus cache Redis:', redisErr.message);
                }

            } catch (err: any) {
                console.error('❌ [MQTT Consumer] Gagal memproses pesan analitik:', err.message);
                // Catatan: Di MQTT QoS 1, jika kita tidak melempar error, pesan tetap dianggap diterima.
                // Jika ingin retry di MQTT, penanganannya biasanya menggunakan mekanisme manual ack / session.
            }
        });

    } catch (error) {
        console.error('❌ [MQTT Consumer] Gagal menjalankan consumer:', error);
    }
};