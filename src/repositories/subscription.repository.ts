import { Transaction, FindOptions, CreationAttributes } from "sequelize";
import { Subscription } from "../models";
import { SubscriptionAttributes } from "../models/subscription.model";

export class SubscriptionRepository {
    async findById(id: number, transaction?: Transaction): Promise<Subscription | null> {
        return await Subscription.findByPk(id, { transaction });
    }

    async findByPk(id: number, transaction?: Transaction): Promise<Subscription | null> {
        return await Subscription.findByPk(id, { transaction });
    }

    async findOne(options: FindOptions<SubscriptionAttributes>): Promise<Subscription | null> {
        return await Subscription.findOne(options);
    }

    async findAll(options?: FindOptions<SubscriptionAttributes>): Promise<Subscription[]> {
        return await Subscription.findAll(options);
    }

    async findActiveByUserId(userId: number, transaction?: Transaction): Promise<Subscription | null> {
        return await Subscription.findOne({
            where: {
                user_id: userId,
                status: "active"
            },
            include: ["plan"],
            transaction
        });
    }

    async findByUserId(userId: number, transaction?: Transaction): Promise<Subscription[]> {
        return await Subscription.findAll({
            where: { user_id: userId },
            include: ["plan"],
            order: [["created_at", "DESC"]],
            transaction
        });
    }

    async create(payload: CreationAttributes<Subscription>, transaction?: Transaction): Promise<Subscription> {
        return await Subscription.create(payload as any, { transaction });
    }

    async update(payload: Partial<CreationAttributes<Subscription>>, options: { where: any; transaction?: Transaction }): Promise<number> {
        const [affectedCount] = await Subscription.update(payload, options);
        return affectedCount;
    }

    async destroy(id: number, transaction?: Transaction): Promise<boolean> {
        const subscription = await Subscription.findByPk(id, { transaction });
        if (subscription) {
            await subscription.destroy({ transaction });
            return true;
        }
        return false;
    }
}

export const subscriptionRepository = new SubscriptionRepository();
