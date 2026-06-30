import { getRabbitChannel } from "../../../config/rabbitmq_client";
import { RabbitMQClient } from "../../rabbitmq/infrastructure/rabbitmq.client";
import { Scan } from "../../../models";

export class RetryDlqMessageUseCase {
    private static readonly DLQ_QUEUE_NAME = 'payment_dead_letter_queue';

    async execute(targetId: string): Promise<boolean> {
        const channel = getRabbitChannel();
        const skippedRabbitMessages: any[] = [];
        let isRetrySuccessful = false;

        try {
            while (true) {
                const rabbitMessage = await channel.get(RetryDlqMessageUseCase.DLQ_QUEUE_NAME, { noAck: false });
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

                    await RabbitMQClient.publishEvent(targetRoutingKey, parsedPayload);
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
}
