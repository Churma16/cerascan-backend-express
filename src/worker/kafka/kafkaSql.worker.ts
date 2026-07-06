import { kafka } from "../../config/kafkaClient";
import { UpdateScanSuccessUseCase } from "../../modules/scan/use-cases/UpdateScanSuccessUseCase";
import { RecordCompletedScanUseCase } from "../../modules/leaderboard/use-cases/RecordCompletedScanUseCase";
import { log } from "../../utils/logger";

const consumer = kafka.consumer({ groupId: 'ceramic-sql-group' });
const TOPIC_NAME = 'ceramic-scan-completed';

export const startSqlConsumer = async (): Promise<void> => {
    try {
        await consumer.connect();
        log.success('Kafka SQL Worker', 'Berhasil terhubung');

        await consumer.subscribe({ topic: TOPIC_NAME, fromBeginning: false });
        log.info('Kafka SQL Worker', `Mendengarkan topik: ${TOPIC_NAME}`);

        await consumer.run({
            eachMessage: async ({ message }) => {
                try {
                    const messageVal = message.value?.toString();
                    if (!messageVal) return;

                    const payload = JSON.parse(messageVal);
                    log.info('Kafka SQL Worker', `Menyimpan hasil prediksi scan_id: ${payload.scan_id}`);

                    if (payload.db_id) {
                        const updateScanSuccessUseCase = new UpdateScanSuccessUseCase();
                        await updateScanSuccessUseCase.execute(
                            payload.db_id,
                            payload.prediction,
                            payload.confidence_score,
                            payload.inference_time,
                            payload.user_id
                        );
                        log.success('Kafka SQL Worker', `Database SQL terupdate untuk db_id: ${payload.db_id}`);
                    }

                    if (payload.user_id && payload.prediction) {
                        const recordCompletedScanUseCase = new RecordCompletedScanUseCase();
                        await recordCompletedScanUseCase.execute(payload.user_id, payload.prediction);
                        log.success('Kafka SQL Worker', `Leaderboard terupdate untuk user_id: ${payload.user_id}`);
                    }

                } catch (err: any) {
                    log.error('Kafka SQL Worker', `Gagal memproses pesan: ${err.message}`);
                }
            },
        });
    } catch (error) {
        log.error('Kafka SQL Worker', 'Gagal menjalankan consumer:', error);
    }
};
