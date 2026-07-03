// File: src/worker/kafka_sql.worker.ts
import { kafka } from "../config/kafka.client";
import { UpdateScanSuccessUseCase } from "../modules/scan/use-cases/UpdateScanSuccessUseCase";
import { RecordCompletedScanUseCase } from "../modules/leaderboard/use-cases/RecordCompletedScanUseCase";

const consumer = kafka.consumer({ groupId: 'ceramic-sql-group' });
const TOPIC_NAME = 'ceramic-scan-completed';

export const startSqlConsumer = async (): Promise<void> => {
    try {
        await consumer.connect();
        console.log('[Kafka SQL Worker] Berhasil terhubung');

        await consumer.subscribe({ topic: TOPIC_NAME, fromBeginning: false });
        console.log(`[Kafka SQL Worker] Mendengarkan topik: ${TOPIC_NAME}`);

        await consumer.run({
            eachMessage: async ({ message }) => {
                try {
                    const messageVal = message.value?.toString();
                    if (!messageVal) return;

                    const payload = JSON.parse(messageVal);
                    console.log(`[Kafka SQL Worker] Menyimpan hasil prediksi scan_id: ${payload.scan_id}`);

                    if (payload.db_id) {
                        const updateScanSuccessUseCase = new UpdateScanSuccessUseCase();
                        await updateScanSuccessUseCase.execute(
                            payload.db_id,
                            payload.prediction,
                            payload.confidence_score,
                            payload.inference_time,
                            payload.user_id
                        );
                        console.log(`[Kafka SQL Worker] Database SQL terupdate untuk db_id: ${payload.db_id}`);
                    }

                    if (payload.user_id && payload.prediction) {
                        const recordCompletedScanUseCase = new RecordCompletedScanUseCase();
                        await recordCompletedScanUseCase.execute(payload.user_id, payload.prediction);
                        console.log(`[Kafka SQL Worker] Leaderboard terupdate untuk user_id: ${payload.user_id}`);
                    }

                } catch (err: any) {
                    console.error('[Kafka SQL Worker] Gagal memproses pesan:', err.message);
                }
            },
        });
    } catch (error) {
        console.error('[Kafka SQL Worker] Gagal menjalankan consumer:', error);
    }
};
