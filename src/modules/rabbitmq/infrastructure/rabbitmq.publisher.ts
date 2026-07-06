import { getRabbitChannel } from "../../../config/rabbitmqClient";
import { log } from "../../../utils/logger";

export class RabbitmqPublisher {
    private static readonly EXCHANGE_NAME = 'cerascan_events';
    private static readonly DLX_EXCHANGE_NAME = 'cerascan_events_dlx';
    private static readonly DLX_QUEUE_NAME = 'payment_dead_letter_queue';

    static async setupExchange(): Promise<void> {
        try {
            const channel = getRabbitChannel();

            await channel.assertExchange(this.EXCHANGE_NAME, 'direct', {
                durable: true
            });

            await channel.assertExchange(this.DLX_EXCHANGE_NAME, 'fanout', {
                durable: true
            });

            await channel.assertQueue(this.DLX_QUEUE_NAME, {
                durable: true
            });

            await channel.bindQueue(this.DLX_QUEUE_NAME, this.DLX_EXCHANGE_NAME, '');

            log.info('RabbitMQ', `Exchange '${this.EXCHANGE_NAME}' siap.`);
            log.info('RabbitMQ', `Dead Letter Exchange '${this.DLX_EXCHANGE_NAME}' siap.`);
        } catch (error: unknown) {
            console.error('[RabbitMQ] Gagal setup Exchange:', error);
        }
    }

    static getDLXExchangeName(): string {
        return this.DLX_EXCHANGE_NAME;
    }

    static async publishEvent(routingKey: string, data: unknown): Promise<boolean> {
        try {
            const channel = getRabbitChannel();
            const message = Buffer.from(JSON.stringify(data));

            const isPublished = channel.publish(
                this.EXCHANGE_NAME,
                routingKey,
                message,
                { persistent: true }
            );

            log.success('Pub', `Event '${routingKey}' berhasil disiarkan.`);
            return isPublished;
        } catch (error: unknown) {
            console.error('[Pub] Gagal menyiarkan pesan:', error);
            return false;
        }
    }
}
