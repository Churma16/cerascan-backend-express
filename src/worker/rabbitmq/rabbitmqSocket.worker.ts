import { getRabbitChannel } from "../../config/rabbitmqClient";
import { handleScanBroadcastMessage } from "../handlers/scanBroadcast.handler";
import { log } from "../../utils/logger.util";

const STREAM_NAME = 'ceramic-scan-completed-stream';

/**
 * Menjalankan RabbitMQ Stream Consumer untuk memancarkan notifikasi real-time WebSocket di lingkungan production.
 *
 * @async
 * @function startRabbitSocketConsumer
 * @returns {Promise<void>}
 */
export const startRabbitmqSocketConsumer = async (): Promise<void> => {
    try {
        const channel = getRabbitChannel();
        if (!channel) {
            log.error('RabbitMQ Socket Worker', 'Channel belum diinisialisasi.');
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
                    log.info('RabbitMQ Socket Worker', `Mengirim notifikasi scan_id: ${payload.scan_id}`);

                    await handleScanBroadcastMessage(payload);
                    log.success('RabbitMQ Socket Worker', `Notifikasi terkirim untuk scan_id: ${payload.scan_id}`);

                    channel.ack(msg);
                } catch (err: any) {
                    log.error('RabbitMQ Socket Worker', `Gagal memproses pesan: ${err.message}`);
                    channel.nack(msg, false, false);
                }
            }
        }, {
            noAck: false,
            arguments: { 'x-stream-offset': 'next' }
        });

        log.info('RabbitMQ Socket Worker', `Berhasil terhubung dan mendengarkan stream: ${STREAM_NAME}`);
    } catch (error: any) {
        log.error('RabbitMQ Socket Worker', `Gagal menjalankan consumer: ${error.message}`);
    }
};
