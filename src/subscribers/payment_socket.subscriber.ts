import { getRabbitChannel } from "../config/rabbitmq_client";
import { RabbitMQClient } from "../modules/rabbitmq/infrastructure/rabbitmq.client";
import { EmitPaymentSuccessUseCase } from "../modules/notification/use-cases/EmitPaymentSuccessUseCase";
import { EmitPaymentFailedUseCase } from "../modules/notification/use-cases/EmitPaymentFailedUseCase";
import { log } from "../utils/logger";

export class PaymentSocketSubscriber {
    private static readonly EXCHANGE_NAME = 'cerascan_events';
    private static readonly QUEUE_NAME = 'payment_socket_notifier_queue';
    private static readonly ROUTING_KEY_SUCCESS = 'payment.success';
    private static readonly ROUTING_KEY_FAILED = 'payment.failed';
    private static readonly MAX_RETRIES = 3;
    private static retryMap = new Map<string, number>();

    static async start(): Promise<void> {
        try {
            const channel = getRabbitChannel();

            try {
                await channel.deleteQueue(this.QUEUE_NAME);
                log.info('Worker', `Queue lama '${this.QUEUE_NAME}' dihapus`);
            } catch (err) {
                // Ignore if queue doesn't exist
            }

            await channel.assertQueue(this.QUEUE_NAME, {
                durable: true,
                arguments: {
                    'x-dead-letter-exchange': RabbitMQClient.getDLXExchangeName()
                }
            });

            // Bind to both success and failed events
            await channel.bindQueue(this.QUEUE_NAME, this.EXCHANGE_NAME, this.ROUTING_KEY_SUCCESS);
            await channel.bindQueue(this.QUEUE_NAME, this.EXCHANGE_NAME, this.ROUTING_KEY_FAILED);

            log.info('Worker', `Mendengarkan event payment di antrean '${this.QUEUE_NAME}'...`);

            await channel.consume(this.QUEUE_NAME, async (msg: any) => {
                if (msg !== null) {
                    try {
                        const eventData = JSON.parse(msg.content.toString());
                        const routingKey = msg.fields.routingKey;
                        const messageId = `${eventData.orderId}-${routingKey}`;

                        log.info('Worker', `Menerima notifikasi socket untuk: ${routingKey}`, eventData);

                        if (routingKey === this.ROUTING_KEY_SUCCESS) {
                            const emitSuccessUseCase = new EmitPaymentSuccessUseCase();
                            await emitSuccessUseCase.execute(eventData);
                        } else if (routingKey === this.ROUTING_KEY_FAILED) {
                            const emitFailedUseCase = new EmitPaymentFailedUseCase();
                            await emitFailedUseCase.execute(eventData);
                        }

                        channel.ack(msg);
                        this.retryMap.delete(messageId);

                    } catch (error: unknown) {
                        const routingKey = msg.fields.routingKey;
                        let messageId = 'unknown';
                        try {
                            const eventData = JSON.parse(msg.content.toString());
                            messageId = `${eventData.orderId}-${routingKey}`;
                        } catch(e) {}
                        
                        const retryCount = this.retryMap.get(messageId) || 0;

                        console.error(`[Worker] Gagal memproses notifikasi socket (Retry ${retryCount}/${this.MAX_RETRIES}):`, error);

                        if (retryCount < this.MAX_RETRIES) {
                            this.retryMap.set(messageId, retryCount + 1);
                            channel.nack(msg, false, true); 
                            log.info('Worker', `Pesan di-requeue untuk retry (${retryCount + 1}/${this.MAX_RETRIES})`);
                        } else {
                            channel.nack(msg, false, false);
                            console.error(`[Worker] Pesan gagal dikirim ke Dead Letter Queue`);
                            this.retryMap.delete(messageId);
                        }
                    }
                }
            }, {noAck: false});
        } catch (error: unknown) {
            console.error('[Worker] Gagal menyalakan subscriber socket:', error);
        }
    }
}
