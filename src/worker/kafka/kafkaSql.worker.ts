import { kafka } from "../../config/kafkaClient";
import { handleScanPersistenceMessage } from "../handlers/scanPersistence.handler";
import { log } from "../../utils/logger.util";

const consumer = kafka.consumer({ groupId: 'ceramic-sql-group' });
const TOPIC_NAME = 'ceramic-scan-completed';

/**
 * Menjalankan Kafka Consumer untuk memproses penyimpan data scan ke SQL DB & Leaderboard.
 *
 * @async
 * @function startSqlConsumer
 * @returns {Promise<void>}
 */
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

                    await handleScanPersistenceMessage(payload);
                    log.success('Kafka SQL Worker', `SQL & Leaderboard terupdate untuk scan_id: ${payload.scan_id}`);
                } catch (err: any) {
                    log.error('Kafka SQL Worker', `Gagal memproses pesan: ${err.message}`);
                }
            },
        });
    } catch (error) {
        log.error('Kafka SQL Worker', `Gagal menjalankan consumer: ${error}`);
    }
};
