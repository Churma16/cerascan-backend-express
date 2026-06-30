import { Transaction } from "sequelize";
import UserQuota, { UserQuotaAttributes } from "../../../models/user_quota.model";
import { IUserQuotaRepository } from "../domain/IUserQuotaRepository";

export class SequelizeUserQuotaRepository implements IUserQuotaRepository {
    async findOne(options: { where: any; transaction?: Transaction }): Promise<UserQuota | null> {
        return await UserQuota.findOne(options);
    }

    async findAll(options?: { where?: any; transaction?: Transaction }): Promise<UserQuota[]> {
        return await UserQuota.findAll(options);
    }

    async create(payload: Partial<UserQuotaAttributes>, transaction?: Transaction): Promise<UserQuota> {
        return await UserQuota.create(payload as any, { transaction });
    }

    async upsert(payload: Partial<UserQuotaAttributes>, options?: { transaction?: Transaction; returning?: boolean }): Promise<[UserQuota, boolean | null]> {
        return await UserQuota.upsert(payload as any, options);
    }

    async update(userId: number, payload: Partial<UserQuotaAttributes>, transaction?: Transaction): Promise<number> {
        const [affectedCount] = await UserQuota.update(payload, {
            where: { user_id: userId },
            transaction
        });
        return affectedCount;
    }

    async bulkCreate(records: Array<Partial<UserQuotaAttributes>>, options?: { updateOnDuplicate?: string[]; transaction?: Transaction }): Promise<UserQuota[]> {
        return await UserQuota.bulkCreate(records as any[], options as any);
    }
}
