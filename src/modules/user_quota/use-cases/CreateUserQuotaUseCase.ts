import { UserQuota } from "../../../models";
import { Transaction } from "sequelize";

export interface CreateUserQuotaInput {
    user_id: number;
    total_quota: number;
    used_quota?: number;
    next_reset_date?: Date;
}

export class CreateUserQuotaUseCase {
    async execute(payload: CreateUserQuotaInput, t?: Transaction) {
        const newQuota = await UserQuota.create({
            ...payload,
            used_quota: payload.used_quota || 0,
        }, {
            transaction: t,
        });
        return newQuota.toJSON();
    }
}
