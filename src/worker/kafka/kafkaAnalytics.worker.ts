import { kafka } from "../../config/kafkaClient";
import { handleAnalyticsMessage } from "../handlers/analytics.handler";
import { log } from "../../utils/logger.util";

const consumer = kafka.consumer({ groupId: 'ceramic-analytics-group' });
const TOPIC_NAME = 'ceramic-scan-completed';

/**
 * Menjalankan Kafka Consumer untuk mendengarkan topik analitik scan.
 * Mengkonsumsi pesan event scan_completed dan meneruskannya ke shared analytics handler.
 *
 * @async
 * @function startAnalyticsConsumer
 * @returns {Promise<void>}
 */
export const startAnalyticsConsumer = async (): Promise<void> => {
    try {
        await consumer.connect();
        log.success('Kafka Analytics Worker', 'Berhasil terhubung');

        await consumer.subscribe({ topic: TOPIC_NAME, fromBeginning: false });
        log.info('Kafka Analytics Worker', `Mendengarkan topik: ${TOPIC_NAME}`);

        await consumer.run({
            eachMessage: async ({ message }) => {
                try {
                    const messageVal = message.value?.toString();
                    if (!messageVal) return;

                    const payload = JSON.parse(messageVal);
                    log.info('Kafka Analytics Worker', `Memproses analitik scan_id: ${payload.scan_id}`);

                    await handleAnalyticsMessage(payload);
                    log.success('Kafka Analytics Worker', `Analitik & Redis cache terupdate untuk scan_id: ${payload.scan_id}`);
                } catch (err: any) {
                    log.error('Kafka Analytics Worker', `Gagal memproses pesan analitik: ${err.message}`);
                    throw err;
                }
            },
        });
    } catch (error) {
        log.error('Kafka Analytics Worker', `Gagal menjalankan consumer: ${error}`);
    }
};