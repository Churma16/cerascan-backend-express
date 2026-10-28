import { kafka } from "../../config/kafkaClient";
import { handleScanBroadcastMessage } from "../handlers/scanBroadcast.handler";
import { log } from "../../utils/logger.util";

const consumer = kafka.consumer({ groupId: 'ceramic-socket-group' });
const TOPIC_NAME = 'ceramic-scan-completed';

/**
 * Menjalankan Kafka Consumer untuk meneruskan event notifikasi scan via WebSocket.
 *
 * @async
 * @function startSocketConsumer
 * @returns {Promise<void>}
 */
export const startSocketConsumer = async (): Promise<void> => {
    try {
        await consumer.connect();
        log.success('Kafka Socket Worker', 'Berhasil terhubung');

        await consumer.subscribe({ topic: TOPIC_NAME, fromBeginning: false });
        log.info('Kafka Socket Worker', `Mendengarkan topik: ${TOPIC_NAME}`);

        await consumer.run({
            eachMessage: async ({ message }) => {
                try {
                    const messageVal = message.value?.toString();
                    if (!messageVal) return;

                    const payload = JSON.parse(messageVal);
                    log.info('Kafka Socket Worker', `Mengirim notifikasi scan_id: ${payload.scan_id}`);

                    await handleScanBroadcastMessage(payload);
                    log.success('Kafka Socket Worker', `Notifikasi terkirim untuk scan_id: ${payload.scan_id}`);
                } catch (err: any) {
                    log.error('Kafka Socket Worker', `Gagal memproses pesan: ${err.message}`);
                }
            },
        });
    } catch (error) {
        log.error('Kafka Socket Worker', `Gagal menjalankan consumer: ${error}`);
    }
};
