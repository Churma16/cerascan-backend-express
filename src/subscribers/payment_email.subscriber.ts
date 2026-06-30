import {getRabbitChannel} from "../config/rabbitmq_client";
import { SendPaymentEmailUseCase } from "../modules/email/use-cases/SendPaymentEmailUseCase";
import {RabbitMQService} from "../modules/rabbitmq/rabbitmq.service";

export class PaymentEmailSubscriber {
    private static readonly EXCHANGE_NAME = 'cerascan_events';
    private static readonly QUEUE_NAME = 'payment_email_notifier_queue'
    private static readonly ROUTING_KEY = 'payment.success';
    private static readonly MAX_RETRIES = 3;
    private static retryMap = new Map<string, number>();

    static async start(): Promise<void> {
        try {
            const channel = getRabbitChannel()

            // Delete old queue to avoid config mismatch
            try {
                await channel.deleteQueue(this.QUEUE_NAME);
                console.log(`[Email Worker] Queue lama '${this.QUEUE_NAME}' dihapus`);
            } catch (err) {
                // Queue mungkin tidak ada, itu ok
            }

            await channel.assertQueue(this.QUEUE_NAME, {
                durable: true,
                arguments: {
                    'x-dead-letter-exchange': RabbitMQService.getDLXExchangeName()
                }
            })

            await channel.bindQueue(this.QUEUE_NAME, this.EXCHANGE_NAME, this.ROUTING_KEY);

            await channel.consume(this.QUEUE_NAME, async (msg: { content: { toString: () => string; }; } | null) => {
                if (msg !== null) {
                    try {
                        const eventData = JSON.parse(msg.content.toString());
                        const messageId = `${eventData.orderId}`;

                        const sendPaymentEmailUseCase = new SendPaymentEmailUseCase();
                        await sendPaymentEmailUseCase.execute(eventData.orderId);

                        channel.ack(msg);
                        console.log(`[Email Worker] Email dikirim untuk Order ID: ${eventData.orderId}`);

                        this.retryMap.delete(messageId);

                    } catch (error: unknown) {
                        const eventData = JSON.parse(msg.content.toString());
                        const messageId = `${eventData.orderId}`;
                        const retryCount = this.retryMap.get(messageId) || 0;

                        console.error(
                            `[Email Worker] Gagal mengirim email (Retry ${retryCount}/${this.MAX_RETRIES}):`,
                            error
                        );

                        if (retryCount < this.MAX_RETRIES) {
                            this.retryMap.set(messageId, retryCount + 1);
                            channel.nack(msg, false, true);
                            console.log(`[Email Worker] Pesan di-requeue untuk retry (${retryCount + 1}/${this.MAX_RETRIES})`);
                        } else {
                            channel.nack(msg, false, false);
                            console.error(`[Email Worker] Pesan gagal setelah ${this.MAX_RETRIES} retry, dikirim ke Dead Letter Queue`);
                            this.retryMap.delete(messageId);
                        }
                    }
                }
            }, {noAck: false});
        } catch (error: unknown) {
            console.error('[Email Worker] Gagal menyalakan subscriber:', error);
        }
    }
}
