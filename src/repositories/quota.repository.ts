import { Transaction, FindOptions, CreationAttributes } from "sequelize";
import { UserQuotaModel } from "../models";

export class QuotaRepository {
    async findByUserId(userId: number, transaction?: Transaction): Promise<UserQuotaModel | null> {
        return await UserQuotaModel.findOne({
            where: { user_id: userId },
            transaction
        });
    }

    async findOne(options: FindOptions): Promise<UserQuotaModel | null> {
        return await UserQuotaModel.findOne(options);
    }

    async findAll(options?: FindOptions): Promise<UserQuotaModel[]> {
        return await UserQuotaModel.findAll(options);
    }

    async create(payload: CreationAttributes<UserQuotaModel>, transaction?: Transaction): Promise<UserQuotaModel> {
        return await UserQuotaModel.create(payload as any, { transaction });
    }

    async upsert(payload: CreationAttributes<UserQuotaModel>, options?: { transaction?: Transaction; returning?: boolean }): Promise<[UserQuotaModel, boolean | null]> {
        return await UserQuotaModel.upsert(payload as any, options);
    }

    async update(userId: number, payload: Partial<CreationAttributes<UserQuotaModel>>, transaction?: Transaction): Promise<number> {
        const [affectedCount] = await UserQuotaModel.update(payload, {
            where: { user_id: userId },
            transaction
        });
        return affectedCount;
    }

    async bulkCreate(records: Array<CreationAttributes<UserQuotaModel>>, options?: { updateOnDuplicate?: string[]; transaction?: Transaction }): Promise<UserQuotaModel[]> {
        return await UserQuotaModel.bulkCreate(records as any[], options as any);
    }
}

export const quotaRepository = new QuotaRepository();
