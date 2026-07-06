import { getRabbitChannel } from "../../../config/rabbitmqClient";
import { RabbitmqPublisher } from "../../rabbitmq/infrastructure/rabbitmq.publisher";
import { Scan } from "../../../models";
import { CheckAndDecrementQuotaUseCase } from "../../user_quota/use-cases/CheckAndDecrementQuotaUseCase";
import { log } from "../../../utils/logger";

export class RetryAllDlqMessagesUseCase {
    private static readonly DLQ_QUEUE_NAME = 'payment_dead_letter_queue';

    async execute(requestUserId: number, isAdmin: boolean): Promise<{ successCount: number, skippedCount: number }> {
        const channel = getRabbitChannel();
        const skippedRabbitMessages: any[] = [];
        let successCount = 0;
        let skippedCount = 0;

        try {
            while (true) {
                const rabbitMessage = await channel.get(RetryAllDlqMessagesUseCase.DLQ_QUEUE_NAME, { noAck: false });
                if (!rabbitMessage) {
                    break;
                }

                let parsedPayload: any;
                try {
                    parsedPayload = JSON.parse(rabbitMessage.content.toString());
                } catch (error) {
                    parsedPayload = {};
                }

                let targetRoutingKey = parsedPayload.db_id || parsedPayload.scan_id ? 'scan.process' : 'payment.success';
                const deadLetterHeaders = rabbitMessage.properties.headers?.['x-death'];
                if (deadLetterHeaders && deadLetterHeaders.length > 0) {
                    targetRoutingKey = deadLetterHeaders[0]['routing-keys']?.[0] || targetRoutingKey;
                }

                // Pengecekan Kepemilikan (Ownership)
                if (!isAdmin && parsedPayload.user_id && parsedPayload.user_id !== requestUserId) {
                    skippedRabbitMessages.push(rabbitMessage);
                    skippedCount++;
                    continue;
                }

                let shouldRetry = true;

                if (parsedPayload.db_id) {
                    if (targetRoutingKey === 'scan.process' && parsedPayload.user_id) {
                        const checkAndDecrementQuotaUseCase = new CheckAndDecrementQuotaUseCase();
                        const hasQuota = await checkAndDecrementQuotaUseCase.execute(parsedPayload.user_id);
                        
                        if (!hasQuota) {
                            shouldRetry = false;
                        }
                    }

                    if (shouldRetry) {
                        try {
                            await Scan.update(
                                { prediction: 'processing' },
                                { where: { id: parsedPayload.db_id } }
                            );
                            log.info('DLQ Service', `Status DB diubah kembali ke 'processing' untuk ID: ${parsedPayload.db_id}`);
                        } catch (dbError) {
                            log.error('DLQ Service', 'Gagal update status DB ke \'processing\':', dbError);
                        }
                    }
                }

                if (shouldRetry) {
                    await RabbitmqPublisher.publishEvent(targetRoutingKey, parsedPayload);
                    channel.ack(rabbitMessage);
                    successCount++;
                } else {
                    skippedRabbitMessages.push(rabbitMessage);
                    skippedCount++;
                }
            }

            for (const skippedMsg of skippedRabbitMessages) {
                channel.nack(skippedMsg, false, true);
            }

            return { successCount, skippedCount };
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
