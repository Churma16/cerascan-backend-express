import { getRabbitChannel } from "../../config/rabbitmqClient";
import { handleScanPersistenceMessage } from "../handlers/scanPersistence.handler";
import { log } from "../../utils/logger.util";

const STREAM_NAME = 'ceramic-scan-completed-stream';

/**
 * Menjalankan RabbitMQ Stream Consumer untuk memperbarui SQL DB & Leaderboard di lingkungan production.
 *
 * @async
 * @function startRabbitSqlConsumer
 * @returns {Promise<void>}
 */
export const startRabbitmqSqlConsumer = async (): Promise<void> => {
    try {
        const channel = getRabbitChannel();
        if (!channel) {
            log.error('RabbitMQ SQL Worker', 'Channel belum diinisialisasi.');
            return;
        }

        await channel.assertQueue(STREAM_NAME, {
            durable: true,
            arguments: { 'x-queue-type': 'stream' }
        });

        await channel.prefetch(100);

        await channel.consume(STREAM_NAME, async (msg: any) => {
            if (msg) {
                try {
                    const messageVal = msg.content.toString();
                    if (!messageVal) {
                        channel.ack(msg);
                        return;
                    }

                    const payload = JSON.parse(messageVal);
                    log.info('RabbitMQ SQL Worker', `Menyimpan hasil prediksi scan_id: ${payload.scan_id}`);

                    await handleScanPersistenceMessage(payload);
                    log.success('RabbitMQ SQL Worker', `SQL & Leaderboard terupdate untuk scan_id: ${payload.scan_id}`);

                    channel.ack(msg);
                } catch (err: any) {
                    log.error('RabbitMQ SQL Worker', `Gagal memproses pesan: ${err.message}`);
                    channel.nack(msg, false, false);
                }
            }
        }, {
            noAck: false,
            arguments: { 'x-stream-offset': 'next' }
        });

        log.info('RabbitMQ SQL Worker', `Berhasil terhubung dan mendengarkan stream: ${STREAM_NAME}`);
    } catch (error: any) {
        log.error('RabbitMQ SQL Worker', `Gagal menjalankan consumer: ${error.message}`);
    }
};
