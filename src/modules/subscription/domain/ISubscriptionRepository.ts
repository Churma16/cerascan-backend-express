import { Transaction } from "sequelize";
import Subscription, { SubscriptionAttributes } from "../../../models/subscription.model";

export interface ISubscriptionRepository {
    findById(id: number, transaction?: Transaction): Promise<Subscription | null>;
    findByPk(id: number, transaction?: Transaction): Promise<Subscription | null>;
    findOne(options: { where: any; include?: any; order?: any; transaction?: Transaction }): Promise<Subscription | null>;
    findAll(options?: { where?: any; include?: any; order?: any; attributes?: any; raw?: boolean; transaction?: Transaction }): Promise<any[]>;
    create(payload: Partial<SubscriptionAttributes>, transaction?: Transaction): Promise<Subscription>;
    update(payload: Partial<SubscriptionAttributes>, options: { where: any; transaction?: Transaction }): Promise<number>;
    destroy(id: number, transaction?: Transaction): Promise<void>;
}
