import {getRabbitChannel} from "../config/rabbitmq_client";
import { ProcessPaymentWebhookUseCase } from "../modules/payment/use-cases/ProcessPaymentWebhookUseCase";
import {RabbitMQClient} from "../modules/rabbitmq/infrastructure/rabbitmq.client";
import {log} from "../utils/logger";


export class PaymentDBSubscriber {
    private static readonly EXCHANGE_NAME = 'cerascan_events';
    private static readonly QUEUE_NAME = 'payment_db_updater_queue';
    private static readonly ROUTING_KEY = 'payment.success';
    private static readonly MAX_RETRIES = 3;
    private static retryMap = new Map<string, number>(); // Track retry count per message

    static async start(): Promise<void> {
        try {
            const channel = getRabbitChannel();

            try {
                await channel.deleteQueue(this.QUEUE_NAME);
                log.info('Worker', `Queue lama '${this.QUEUE_NAME}' dihapus`);
            } catch (err) {
                // Queue mungkin tidak ada, itu ok
            }

            // 1. Buat antrean/kotak surat khusus untuk tugas update DB ini
            await channel.assertQueue(this.QUEUE_NAME, {
                durable: true, // Antrean tidak hilang walau server restart
                arguments: {
                    'x-dead-letter-exchange': RabbitMQClient.getDLXExchangeName()
                }
            });

            // 2. Ikat (Bind) kotak surat ke Pusat Siaran dengan kunci 'payment.success'
            await channel.bindQueue(this.QUEUE_NAME, this.EXCHANGE_NAME, this.ROUTING_KEY);

            log.info('Worker', `Mendengarkan event '${this.ROUTING_KEY}' di antrean '${this.QUEUE_NAME}'...`);

            // 3. Mulai mengambil pesan yang masuk
            await channel.consume(this.QUEUE_NAME, async (msg: { content: { toString: () => string; }; } | null) => {
                if (msg !== null) {
                    try {
                        // Buka isi pesan (Buffer -> String -> JSON)
                        const eventData = JSON.parse(msg.content.toString());
                        const messageId = `${eventData.orderId}`;

                        log.info('Worker', 'Menerima tugas pembaruan pembayaran:', eventData);

                        // 4. Update Database menggunakan Use Case
                        const processPaymentWebhookUseCase = new ProcessPaymentWebhookUseCase();
                        await processPaymentWebhookUseCase.execute(eventData);

                        // 5. Beri tahu RabbitMQ bahwa tugas selesai dengan aman (Acknowledge)
                        channel.ack(msg);
                        log.success('Worker', `Tugas pembaruan pembayaran berhasil diproses untuk Order: ${eventData.orderId}`);

                        // Clear retry count untuk message ini
                        this.retryMap.delete(messageId);

                    } catch (error: unknown) {
                        const eventData = JSON.parse(msg.content.toString());
                        const messageId = `${eventData.orderId}`;
                        const retryCount = this.retryMap.get(messageId) || 0;

                        console.error(
                            `[Worker] Gagal memproses pembaruan DB (Retry ${retryCount}/${this.MAX_RETRIES}):`,
                            error
                        );

                        if (retryCount < this.MAX_RETRIES) {
                            // Increment retry count dan requeue message
                            this.retryMap.set(messageId, retryCount + 1);
                            channel.nack(msg, false, true); // Requeue ke antrian
                            log.info('Worker', `Pesan di-requeue untuk retry (${retryCount + 1}/${this.MAX_RETRIES})`);
                        } else {
                            // Sudah max retry, kirim ke Dead Letter Exchange
                            channel.nack(msg, false, false); // Tidak di-requeue, akan ke DLX
                            console.error(`[Worker] Pesan gagal setelah ${this.MAX_RETRIES} retry, dikirim ke Dead Letter Queue`);
                            this.retryMap.delete(messageId);
                        }
                    }
                }
            }, {noAck: false});
        } catch (error: unknown) {
            console.error('[Worker] Gagal menyalakan subscriber:', error);
        }
    }
}