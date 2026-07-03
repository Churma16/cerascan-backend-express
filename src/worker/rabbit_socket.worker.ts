
import { getRabbitChannel } from "../config/rabbitmq_client";
import { EmitScanCompletedUseCase } from "../modules/notification/use-cases/EmitScanCompletedUseCase";

const STREAM_NAME = 'ceramic-scan-completed-stream';

export const startRabbitSocketConsumer = async (): Promise<void> => {
    try {
        const channel = getRabbitChannel();
        if (!channel) {
            console.error('[RabbitMQ Socket Worker] Channel belum diinisialisasi.');
            return;
        }

        await channel.assertQueue(STREAM_NAME, {
            durable: true,
            arguments: { 'x-queue-type': 'stream' }
        });

        // Konsumsi stream dengan offset 'next'
        await channel.consume(STREAM_NAME, async (msg: any) => {
            if (msg) {
                try {
                    const messageVal = msg.content.toString();
                    if (!messageVal) {
                        channel.ack(msg);
                        return;
                    }

                    const payload = JSON.parse(messageVal);
                    if (payload.db_id) {
                        const emitScanCompletedUseCase = new EmitScanCompletedUseCase();
                        await emitScanCompletedUseCase.execute({
                            db_id: payload.db_id,
                            scan_id: payload.scan_id,
                            prediction: payload.prediction,
                            confidence: payload.confidence_score,
                            inference_time: payload.inference_time
                        });
                        console.log(`[RabbitMQ Socket Worker] Notifikasi terkirim untuk scan_id: ${payload.scan_id}`);
                    }
                    
                    channel.ack(msg);
                } catch (err: any) {
                    console.error('[RabbitMQ Socket Worker] Gagal memproses pesan:', err.message);
                    channel.nack(msg, false, false); // Buang jika error untuk menghindari blocking stream
                }
            }
        }, {
            noAck: false,
            arguments: { 'x-stream-offset': 'next' }
        });

        console.log(`[RabbitMQ Socket Worker] Berhasil terhubung dan mendengarkan stream: ${STREAM_NAME}`);
    } catch (error) {
        console.error('[RabbitMQ Socket Worker] Gagal menjalankan consumer:', error);
    }
};
