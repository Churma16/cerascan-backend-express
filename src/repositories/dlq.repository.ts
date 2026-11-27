import { Op, Transaction } from "sequelize";
import { DeadLetterMessage } from "../models";
import { DeadLetterMessageAttributes } from "../models/deadLetterMessage.model";

export interface FindDeadMessagesOptions {
    userId?: number;
    limit?: number;
    order?: "ASC" | "DESC";
}

export class DlqRepository {
    async findDeadMessages(options: FindDeadMessagesOptions = {}): Promise<DeadLetterMessage[]> {
        const { userId, limit = 100, order = "DESC" } = options;
        const where: any = {
            status: "dead"
        };

        if (userId !== undefined) {
            where.user_id = userId;
        }

        return await DeadLetterMessage.findAll({
            where,
            order: [["createdAt", order]],
            limit
        });
    }

    async findDeadMessageByIdOrMessageId(targetId: string): Promise<DeadLetterMessage | null> {
        const numericId = Number(targetId);
        return await DeadLetterMessage.findOne({
            where: {
                status: "dead",
                [Op.or]: [
                    { message_id: targetId },
                    ...(!isNaN(numericId) ? [{ id: numericId }] : [])
                ]
            },
            order: [["createdAt", "DESC"]]
        });
    }

    async updateStatus(
        id: number,
        status: "dead" | "retried" | "purged",
        transaction?: Transaction
    ): Promise<number> {
        const [affectedCount] = await DeadLetterMessage.update(
            { status },
            {
                where: { id },
                transaction
            }
        );
        return affectedCount;
    }

    async purgeAllDead(transaction?: Transaction): Promise<number> {
        const [affectedCount] = await DeadLetterMessage.update(
            { status: "purged" },
            {
                where: { status: "dead" },
                transaction
            }
        );
        return affectedCount;
    }

    async save(record: DeadLetterMessage, transaction?: Transaction): Promise<DeadLetterMessage> {
        return await record.save({ transaction });
    }
}

export const dlqRepository = new DlqRepository();
