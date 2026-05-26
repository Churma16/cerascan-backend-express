import {getRabbitChannel} from "../../config/rabbitmq_client";

export class RabbitMQService {
    private static readonly EXCHANGE_NAME = 'cerascan_events';

    // Dipanggil sekali saat server menyala untuk memastikan Exchange ada
    static async setupExchange(): Promise<void> {
        try {
            const channel = getRabbitChannel();

            await channel.assertExchange(this.EXCHANGE_NAME, 'direct', {
                durable: true // Exchange tidak hilang jika server restart
            });

            console.log(`[RabbitMQ] Exchange '${this.EXCHANGE_NAME}' siap.`);
        } catch (error: unknown) {
            console.error('[RabbitMQ] Gagal setup Exchange:', error);
        }
    }

    static async publishEvent(routingKey: string, data: unknown): Promise<boolean> {
        try {
            const channel = getRabbitChannel(); // Ambil channel dari config
            const message = Buffer.from(JSON.stringify(data));

            const isPublished = channel.publish(
                this.EXCHANGE_NAME,
                routingKey,
                message,
                {persistent: true} // Pesan disimpan di disk
            );

            console.log(`[Pub] Event '${routingKey}' berhasil disiarkan.`);
            return isPublished;
        } catch (error: unknown) {
            console.error('[Pub] Gagal menyiarkan pesan:', error);
            return false;
        }
    }
}