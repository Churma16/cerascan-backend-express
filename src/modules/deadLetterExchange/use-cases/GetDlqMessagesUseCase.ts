import { DeadLetterMessage } from "../../../models";
import { WhereOptions } from "sequelize";
import { DeadLetterMessageAttributes } from "../../../models/deadLetterMessage.model";

export class GetDlqMessagesUseCase {
    async execute(requestUserId: number, isAdmin: boolean, limit: number = 100): Promise<any[]> {
        const whereClause: WhereOptions<DeadLetterMessageAttributes> = {
            status: 'dead',
        };

        if (!isAdmin) {
            whereClause.user_id = requestUserId;
        }

        const deadLetterRecords = await DeadLetterMessage.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']],
            limit,
        });

        return deadLetterRecords.map((record) => ({
            id: record.message_id,
            messageId: `${record.message_id}-${record.id}`,
            routingKey: record.routing_key,
            queueName: record.queue_name,
            content: record.payload,
            errorMessage: record.error_message,
            timestamp: record.createdAt,
            retryCount: record.retry_count,
        }));
    }
}
