import { getRabbitChannel } from "../../config/rabbitmqClient";
import { handleAnalyticsMessage } from "../handlers/analytics.handler";
import { log } from "../../utils/logger.util";

const STREAM_NAME = 'ceramic-scan-completed-stream';

/**
 * Menjalankan RabbitMQ Stream Consumer untuk memproses analitik scan di lingkungan production.
 *
 * @async
 * @function startRabbitAnalyticsConsumer
 * @returns {Promise<void>}
 */
export const startRabbitmqAnalyticsConsumer = async (): Promise<void> => {
    try {
        const channel = getRabbitChannel();
        if (!channel) {
            log.error('RabbitMQ Analytics Worker', 'Channel belum diinisialisasi.');
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
                    log.info('RabbitMQ Analytics Worker', `Memproses analitik scan_id: ${payload.scan_id}`);

                    await handleAnalyticsMessage(payload);
                    log.success('RabbitMQ Analytics Worker', `Analitik & Redis cache terupdate untuk scan_id: ${payload.scan_id}`);

                    channel.ack(msg);
                } catch (err: any) {
                    log.error('RabbitMQ Analytics Worker', `Gagal memproses pesan: ${err.message}`);
                    channel.nack(msg, false, false);
                }
            }
        }, {
            noAck: false,
            arguments: { 'x-stream-offset': 'next' }
        });

        log.info('RabbitMQ Analytics Worker', `Berhasil terhubung dan mendengarkan stream: ${STREAM_NAME}`);
    } catch (error: any) {
        log.error('RabbitMQ Analytics Worker', `Gagal menjalankan consumer: ${error.message}`);
    }
};
