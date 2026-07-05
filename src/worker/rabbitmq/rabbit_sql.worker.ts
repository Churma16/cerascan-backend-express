
import { getRabbitChannel } from "../../config/rabbitmq_client";
import { UpdateScanSuccessUseCase } from "../../modules/scan/use-cases/UpdateScanSuccessUseCase";
import { RecordCompletedScanUseCase } from "../../modules/leaderboard/use-cases/RecordCompletedScanUseCase";

const STREAM_NAME = 'ceramic-scan-completed-stream';

export const startRabbitSqlConsumer = async (): Promise<void> => {
    try {
        const channel = getRabbitChannel();
        if (!channel) {
            console.error('[RabbitMQ SQL Worker] Channel belum diinisialisasi.');
            return;
        }

        await channel.assertQueue(STREAM_NAME, {
            durable: true,
            arguments: { 'x-queue-type': 'stream' }
        });

        // set prefetch for RabbitMQ Streams
        await channel.prefetch(100);

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
                    console.log(`[RabbitMQ SQL Worker] Menyimpan hasil prediksi scan_id: ${payload.scan_id}`);

                    if (payload.db_id) {
                        const updateScanSuccessUseCase = new UpdateScanSuccessUseCase();
                        await updateScanSuccessUseCase.execute(
                            payload.db_id,
                            payload.prediction,
                            payload.confidence_score,
                            payload.inference_time,
                            payload.user_id
                        );
                        console.log(`[RabbitMQ SQL Worker] Database SQL terupdate untuk db_id: ${payload.db_id}`);
                    }

                    if (payload.user_id && payload.prediction) {
                        const recordCompletedScanUseCase = new RecordCompletedScanUseCase();
                        await recordCompletedScanUseCase.execute(payload.user_id, payload.prediction);
                        console.log(`[RabbitMQ SQL Worker] Leaderboard terupdate untuk user_id: ${payload.user_id}`);
                    }
                    
                    channel.ack(msg);
                } catch (err: any) {
                    console.error('[RabbitMQ SQL Worker] Gagal memproses pesan:', err.message);
                    channel.nack(msg, false, false); // Buang jika error untuk menghindari blocking stream
                }
            }
        }, {
            noAck: false,
            arguments: { 'x-stream-offset': 'next' }
        });

        console.log(`[RabbitMQ SQL Worker] Berhasil terhubung dan mendengarkan stream: ${STREAM_NAME}`);
    } catch (error) {
        console.error('[RabbitMQ SQL Worker] Gagal menjalankan consumer:', error);
    }
};
