import { Transaction } from "sequelize";
import Subscription, { SubscriptionAttributes } from "../../../models/subscription.model";
import { ISubscriptionRepository } from "../domain/ISubscriptionRepository";

export class SequelizeSubscriptionRepository implements ISubscriptionRepository {
    async findById(id: number, transaction?: Transaction): Promise<Subscription | null> {
        return await Subscription.findByPk(id, { transaction });
    }

    async findByPk(id: number, transaction?: Transaction): Promise<Subscription | null> {
        return await Subscription.findByPk(id, { transaction });
    }

    async findOne(options: { where: any; include?: any; order?: any; transaction?: Transaction }): Promise<Subscription | null> {
        return await Subscription.findOne(options);
    }

    async findAll(options?: { where?: any; include?: any; order?: any; attributes?: any; raw?: boolean; transaction?: Transaction }): Promise<any[]> {
        return await Subscription.findAll(options);
    }

    async create(payload: Partial<SubscriptionAttributes>, transaction?: Transaction): Promise<Subscription> {
        return await Subscription.create(payload as any, { transaction });
    }

    async update(payload: Partial<SubscriptionAttributes>, options: { where: any; transaction?: Transaction }): Promise<number> {
        const [affectedCount] = await Subscription.update(payload, options);
        return affectedCount;
    }

    async destroy(id: number, transaction?: Transaction): Promise<void> {
        const subscription = await Subscription.findByPk(id, { transaction });
        if (subscription) {
            await subscription.destroy({ transaction });
        }
    }
}
