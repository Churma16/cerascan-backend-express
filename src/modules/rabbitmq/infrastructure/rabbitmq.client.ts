import { getRabbitChannel } from "../../../config/rabbitmq_client";

export class RabbitMQClient {
    private static readonly EXCHANGE_NAME = 'cerascan_events';
    private static readonly DLX_EXCHANGE_NAME = 'cerascan_events_dlx'; // Dead Letter Exchange
    private static readonly DLX_QUEUE_NAME = 'payment_dead_letter_queue';

    // Dipanggil sekali saat server menyala untuk memastikan Exchange ada
    static async setupExchange(): Promise<void> {
        try {
            const channel = getRabbitChannel();

            // Setup main exchange
            await channel.assertExchange(this.EXCHANGE_NAME, 'direct', {
                durable: true // Exchange tidak hilang jika server restart
            });

            // Setup Dead Letter Exchange untuk error handling
            await channel.assertExchange(this.DLX_EXCHANGE_NAME, 'fanout', {
                durable: true
            });

            // Setup Dead Letter Queue untuk pesan yang gagal
            await channel.assertQueue(this.DLX_QUEUE_NAME, {
                durable: true
            });

            await channel.bindQueue(this.DLX_QUEUE_NAME, this.DLX_EXCHANGE_NAME, '');

            console.log(`[RabbitMQ] Exchange '${this.EXCHANGE_NAME}' siap.`);
            console.log(`[RabbitMQ] Dead Letter Exchange '${this.DLX_EXCHANGE_NAME}' siap.`);
        } catch (error: unknown) {
            console.error('[RabbitMQ] Gagal setup Exchange:', error);
        }
    }

    static getDLXExchangeName(): string {
        return this.DLX_EXCHANGE_NAME;
    }

    static async publishEvent(routingKey: string, data: unknown): Promise<boolean> {
        try {
            const channel = getRabbitChannel(); // Ambil channel dari config
            const message = Buffer.from(JSON.stringify(data));

            const isPublished = channel.publish(
                this.EXCHANGE_NAME,
                routingKey,
                message,
                { persistent: true } // Pesan disimpan di disk
            );

            console.log(`[Pub] Event '${routingKey}' berhasil disiarkan.`);
            return isPublished;
        } catch (error: unknown) {
            console.error('[Pub] Gagal menyiarkan pesan:', error);
            return false;
        }
    }
}
