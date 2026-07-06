import { Transaction } from "sequelize";
import UserQuotaModel, { UserQuotaAttributes } from "../../../models/userQuota.model";

export interface IUserQuotaRepository {
    findOne(options: { where: any; transaction?: Transaction }): Promise<UserQuotaModel | null>;
    findAll(options?: { where?: any; transaction?: Transaction }): Promise<UserQuotaModel[]>;
    create(payload: Partial<UserQuotaAttributes>, transaction?: Transaction): Promise<UserQuotaModel>;
    upsert(payload: Partial<UserQuotaAttributes>, options?: { transaction?: Transaction; returning?: boolean }): Promise<[UserQuotaModel, boolean | null]>;
    update(userId: number, payload: Partial<UserQuotaAttributes>, transaction?: Transaction): Promise<number>;
    bulkCreate(records: Array<Partial<UserQuotaAttributes>>, options?: { updateOnDuplicate?: string[]; transaction?: Transaction }): Promise<UserQuotaModel[]>;
}
