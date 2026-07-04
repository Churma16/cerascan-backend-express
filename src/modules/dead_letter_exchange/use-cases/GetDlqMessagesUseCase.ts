import { getRabbitChannel } from "../../../config/rabbitmq_client";

export class GetDlqMessagesUseCase {
    private static readonly DLQ_QUEUE_NAME = 'payment_dead_letter_queue';

    async execute(requestUserId: number, isAdmin: boolean, limit: number = 100): Promise<any[]> {
        const channel = getRabbitChannel();
        const formattedMessages: any[] = [];
        const rawRabbitMessages: any[] = [];

        try {
            while (formattedMessages.length < limit) {
                const rabbitMessage = await channel.get(GetDlqMessagesUseCase.DLQ_QUEUE_NAME, { noAck: false });
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

                // Filter Privasi: Jika bukan admin, pastikan pesan memiliki user_id yang cocok
                if (!isAdmin) {
                    if (!parsedPayload.user_id || parsedPayload.user_id !== requestUserId) {
                        continue; // Lewati pesan ini (tetap akan di nack nanti)
                    }
                }

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
}
