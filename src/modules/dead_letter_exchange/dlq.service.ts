import {getRabbitChannel} from "../../config/rabbitmq_client";
import {RabbitMQService} from "../rabbitmq/rabbitmq.service";
import {Scan} from "../../models";

export class DLQService {
    private static readonly DLQ_QUEUE_NAME = 'payment_dead_letter_queue';
    private static readonly EXCHANGE_NAME = 'cerascan_events';

    static async getMessages(limit: number = 100): Promise<any[]> {
        const channel = getRabbitChannel();
        const formattedMessages: any[] = [];
        const rawRabbitMessages: any[] = [];

        try {
            while (formattedMessages.length < limit) {
                const rabbitMessage = await channel.get(this.DLQ_QUEUE_NAME, {noAck: false});
                if (!rabbitMessage) {
                    break;
                }
                rawRabbitMessages.push(rabbitMessage);

                let parsedPayload: any;
                try {
                    parsedPayload = JSON.parse(rabbitMessage.content.toString());
                } catch (error) {
                    parsedPayload = rabbitMessage.content.toString();
                }

                let targetRoutingKey = rabbitMessage.fields.routingKey;
                const deadLetterHeaders = rabbitMessage.properties.headers?.['x-death'];
                if (deadLetterHeaders && deadLetterHeaders.length > 0) {
                    targetRoutingKey = deadLetterHeaders[0]['routing-keys']?.[0] || targetRoutingKey;
                }

                const trackingId = parsedPayload.orderId || parsedPayload.db_id || parsedPayload.scan_id || 'unknown';

                formattedMessages.push({
                    id: trackingId,
                    messageId: rabbitMessage.properties.messageId || `${trackingId}-${rabbitMessage.fields.deliveryTag}`,
                    routingKey: targetRoutingKey,
                    content: parsedPayload,
                    timestamp: rabbitMessage.properties.timestamp ? new Date(rabbitMessage.properties.timestamp * 1000) : new Date(),
                    deliveryTag: rabbitMessage.fields.deliveryTag
                });
            }

            for (const rawMsg of rawRabbitMessages) {
                channel.nack(rawMsg, false, true);
            }

            return formattedMessages;
        } catch (error) {
            for (const rawMsg of rawRabbitMessages) {
                try {
                    channel.nack(rawMsg, false, true);
                } catch (nackError) {
                }
            }
            throw error;
        }
    }

    static async retryMessage(targetId: string): Promise<boolean> {
        const channel = getRabbitChannel();
        const skippedRabbitMessages: any[] = [];
        let isRetrySuccessful = false;

        try {
            while (true) {
                const rabbitMessage = await channel.get(this.DLQ_QUEUE_NAME, { noAck: false });
                if (!rabbitMessage) {
                    break;
                }

                let parsedPayload: any;
                try {
                    parsedPayload = JSON.parse(rabbitMessage.content.toString());
                } catch (error) {
                    parsedPayload = {};
                }

                const messagePayloadId = `${parsedPayload.orderId || parsedPayload.db_id || parsedPayload.scan_id || ''}`;

                if (messagePayloadId === targetId) {
                    let targetRoutingKey = parsedPayload.db_id || parsedPayload.scan_id ? 'scan.process' : 'payment.success';

                    const deadLetterHeaders = rabbitMessage.properties.headers?.['x-death'];
                    if (deadLetterHeaders && deadLetterHeaders.length > 0) {
                        targetRoutingKey = deadLetterHeaders[0]['routing-keys']?.[0] || targetRoutingKey;
                    }

                    if (parsedPayload.db_id) {
                        try {
                            await Scan.update(
                                { prediction: 'processing' },
                                { where: { id: parsedPayload.db_id } }
                            );
                            console.log(`[DLQ Service] Status DB diubah kembali ke 'processing' untuk ID: ${parsedPayload.db_id}`);
                        } catch (dbError) {
                            console.error(`[DLQ Service] Gagal update status DB ke 'processing':`, dbError);
                        }
                    }

                    await RabbitMQService.publishEvent(targetRoutingKey, parsedPayload);
                    channel.ack(rabbitMessage);

                    isRetrySuccessful = true;
                    break;
                } else {
                    skippedRabbitMessages.push(rabbitMessage);
                }
            }

            for (const skippedMsg of skippedRabbitMessages) {
                channel.nack(skippedMsg, false, true);
            }

            return isRetrySuccessful;
        } catch (error) {
            for (const skippedMsg of skippedRabbitMessages) {
                try {
                    channel.nack(skippedMsg, false, true);
                } catch (nackError) {
                }
            }
            throw error;
        }
    }
    static async purgeQueue(): Promise<void> {
        const channel = getRabbitChannel();
        await channel.purgeQueue(this.DLQ_QUEUE_NAME);
    }
}
