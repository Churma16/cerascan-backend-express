import {getRabbitChannel} from "../../config/rabbitmq_client";
import {RabbitMQService} from "../rabbitmq/rabbitmq.service";
import {Scan} from "../../models";

export class DLQService {
    private static readonly DLQ_QUEUE_NAME = 'payment_dead_letter_queue';
    private static readonly EXCHANGE_NAME = 'cerascan_events';

    static async getMessages(limit: number = 100): Promise<any[]> {
        const channel = getRabbitChannel();
        const messages: any[] = [];
        const fetchedMsgs: any[] = [];

        try {
            let msg;
            while (messages.length < limit) {
                msg = await channel.get(this.DLQ_QUEUE_NAME, { noAck: false });
                if (!msg) {
                    break;
                }
                fetchedMsgs.push(msg);

                let content;
                try {
                    content = JSON.parse(msg.content.toString());
                } catch (e) {
                    content = msg.content.toString();
                }

                let originalRoutingKey = msg.fields.routingKey;
                const xDeath = msg.properties.headers?.['x-death'];
                if (xDeath && xDeath.length > 0) {
                    originalRoutingKey = xDeath[0]['routing-keys']?.[0] || originalRoutingKey;
                }

                const payloadId = content.orderId || content.db_id || content.scan_id || 'unknown';

                messages.push({
                    id: payloadId,
                    messageId: msg.properties.messageId || `${payloadId}-${msg.fields.deliveryTag}`,
                    routingKey: originalRoutingKey,
                    content: content,
                    timestamp: msg.properties.timestamp ? new Date(msg.properties.timestamp * 1000) : new Date(),
                    deliveryTag: msg.fields.deliveryTag
                });
            }

            for (const fMsg of fetchedMsgs) {
                channel.nack(fMsg, false, true);
            }

            return messages;
        } catch (error) {
            for (const fMsg of fetchedMsgs) {
                try {
                    channel.nack(fMsg, false, true);
                } catch (e) {}
            }
            throw error;
        }
    }

    static async retryMessage(id: string): Promise<boolean> {
        const channel = getRabbitChannel();
        const fetchedMsgs: any[] = [];
        let success = false;

        try {
            let msg;
            while (true) {
                msg = await channel.get(this.DLQ_QUEUE_NAME, { noAck: false });
                if (!msg) {
                    break;
                }

                let content;
                try {
                    content = JSON.parse(msg.content.toString());
                } catch (e) {
                    content = {};
                }

                const payloadId = `${content.orderId || content.db_id || content.scan_id || ''}`;
                
                if (payloadId === id) {
                    let routingKey = 'payment.success';
                    if (content.db_id || content.scan_id) {
                        routingKey = 'scan.process';
                    }
                    
                    const xDeath = msg.properties.headers?.['x-death'];
                    if (xDeath && xDeath.length > 0) {
                        routingKey = xDeath[0]['routing-keys']?.[0] || routingKey;
                    }

                    // Jika ini adalah event scan, update status di DB kembali ke 'processing'
                    if (content.db_id) {
                        try {
                            await Scan.update({
                                prediction: 'processing'
                            }, {
                                where: { id: content.db_id }
                            });
                            console.log(`[DLQ Service] Status DB diubah kembali ke 'processing' untuk ID: ${content.db_id}`);
                        } catch (dbErr) {
                            console.error(`[DLQ Service] Gagal update status DB ke 'processing':`, dbErr);
                        }
                    }

                    await RabbitMQService.publishEvent(routingKey, content);
                    channel.ack(msg);
                    success = true;
                    break;
                } else {
                    fetchedMsgs.push(msg);
                }
            }

            for (const fMsg of fetchedMsgs) {
                channel.nack(fMsg, false, true);
            }

            return success;
        } catch (error) {
            for (const fMsg of fetchedMsgs) {
                try {
                    channel.nack(fMsg, false, true);
                } catch (e) {}
            }
            throw error;
        }
    }

    static async purgeQueue(): Promise<void> {
        const channel = getRabbitChannel();
        await channel.purgeQueue(this.DLQ_QUEUE_NAME);
    }
}
