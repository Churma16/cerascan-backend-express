import { Transaction } from "sequelize";
import UserQuota, { UserQuotaAttributes } from "../../../models/user_quota.model";

export interface IUserQuotaRepository {
    findOne(options: { where: any; transaction?: Transaction }): Promise<UserQuota | null>;
    findAll(options?: { where?: any; transaction?: Transaction }): Promise<UserQuota[]>;
    create(payload: Partial<UserQuotaAttributes>, transaction?: Transaction): Promise<UserQuota>;
    upsert(payload: Partial<UserQuotaAttributes>, options?: { transaction?: Transaction; returning?: boolean }): Promise<[UserQuota, boolean | null]>;
    update(userId: number, payload: Partial<UserQuotaAttributes>, transaction?: Transaction): Promise<number>;
    bulkCreate(records: Array<Partial<UserQuotaAttributes>>, options?: { updateOnDuplicate?: string[]; transaction?: Transaction }): Promise<UserQuota[]>;
}
