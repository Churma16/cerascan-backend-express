import { Transaction } from "sequelize";
import UserQuotaModel, { UserQuotaAttributes } from "../../../models/userQuota.model";
import { IUserQuotaRepository } from "../domain/IUserQuotaRepository";

export class SequelizeUserQuotaRepository implements IUserQuotaRepository {
    async findOne(options: { where: any; transaction?: Transaction }): Promise<UserQuotaModel | null> {
        return await UserQuotaModel.findOne(options);
    }

    async findAll(options?: { where?: any; transaction?: Transaction }): Promise<UserQuotaModel[]> {
        return await UserQuotaModel.findAll(options);
    }

    async create(payload: Partial<UserQuotaAttributes>, transaction?: Transaction): Promise<UserQuotaModel> {
        return await UserQuotaModel.create(payload as any, { transaction });
    }

    async upsert(payload: Partial<UserQuotaAttributes>, options?: { transaction?: Transaction; returning?: boolean }): Promise<[UserQuotaModel, boolean | null]> {
        return await UserQuotaModel.upsert(payload as any, options);
    }

    async update(userId: number, payload: Partial<UserQuotaAttributes>, transaction?: Transaction): Promise<number> {
        const [affectedCount] = await UserQuotaModel.update(payload, {
            where: { user_id: userId },
            transaction
        });
        return affectedCount;
    }

    async bulkCreate(records: Array<Partial<UserQuotaAttributes>>, options?: { updateOnDuplicate?: string[]; transaction?: Transaction }): Promise<UserQuotaModel[]> {
        return await UserQuotaModel.bulkCreate(records as any[], options as any);
    }
}
