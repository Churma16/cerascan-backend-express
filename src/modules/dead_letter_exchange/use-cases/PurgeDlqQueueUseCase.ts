import { getRabbitChannel } from "../../../config/rabbitmq_client";

export class PurgeDlqQueueUseCase {
    private static readonly DLQ_QUEUE_NAME = 'payment_dead_letter_queue';

    async execute(): Promise<void> {
        const channel = getRabbitChannel();
        await channel.purgeQueue(PurgeDlqQueueUseCase.DLQ_QUEUE_NAME);
    }
}
