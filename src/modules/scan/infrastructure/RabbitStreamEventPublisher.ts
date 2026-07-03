
import { IAnalyticsPublisher, AnalyticsPayload } from './IAnalyticsPublisher';
import { getRabbitChannel } from '../../../config/rabbitmq_client';

export class RabbitStreamEventPublisher implements IAnalyticsPublisher {
    private channel: any;
    private streamName = 'ceramic-scan-completed-stream';

    async connect(): Promise<void> {
        this.channel = getRabbitChannel();
        // Deklarasi Stream Queue RabbitMQ
        await this.channel.assertQueue(this.streamName, {
            durable: true,
            arguments: {
                'x-queue-type': 'stream'
            }
        });
    }

    async publish(data: AnalyticsPayload): Promise<void> {
        try {
            if (!this.channel) {
                await this.connect();
            }

            const messagePayload = {
                ...data,
                timestamp: new Date().toISOString()
            };

            const success = this.channel.sendToQueue(
                this.streamName,
                Buffer.from(JSON.stringify(messagePayload))
            );

            if (success) {
                console.log(`[RabbitMQ Stream] Berhasil mengirim event scan_id: ${data.scan_id}`);
            } else {
                console.warn(`[RabbitMQ Stream] Buffer penuh saat mengirim scan_id: ${data.scan_id}`);
            }
        } catch (error: any) {
            console.error('[RabbitMQ Stream] Gagal mengirim event:', error.message);
        }
    }

    async disconnect(): Promise<void> {
        // Disconnect biasanya dihandle global
    }
}
