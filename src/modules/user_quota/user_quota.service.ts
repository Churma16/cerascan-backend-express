import {UserQuota} from "../../models";

export interface UserQuotaPayload {
    user_id: number;
    total_quota: number;
    used_quota?: number;
    next_reset_date?: Date;
}

export class UserQuotaService {
    static async createUserQuota(payload: UserQuotaPayload) {
        const newQuota = await UserQuota.create({
            ...payload,
            used_quota: payload.used_quota || 0,
        });
        return newQuota.toJSON();
    }

    static async getUserQuotaByUserId(user_id: number) {
        const quota = await UserQuota.findOne({where: {user_id}});
        if (!quota) {
            throw new Error(`Quota untuk user ${user_id} tidak ditemukan`);
        }
        return quota.toJSON();
    }

    static async updateUserQuota(user_id: number, payload: Partial<UserQuotaPayload>) {
        const quota = await UserQuota.findOne({where: {user_id}});
        if (!quota) {
            throw new Error(`Quota untuk user ${user_id} tidak ditemukan`);
        }
        await quota.update(payload);
        return quota.toJSON();
    }

    static async incrementUsedQuota(user_id: number, amount: number) {
        const quota = await UserQuota.findOne({where: {user_id}});
        if (!quota) {
            throw new Error(`Quota untuk user ${user_id} tidak ditemukan`);
        }
        const newUsedQuota = (quota.used_quota || 0) + amount;
        await quota.update({used_quota: newUsedQuota});
        return quota.toJSON();
    }

    static async resetQuota(user_id: number) {
        const quota = await UserQuota.findOne({where: {user_id}});
        if (!quota) {
            throw new Error(`Quota untuk user ${user_id} tidak ditemukan`);
        }
        await quota.update({used_quota: 0});
        return quota.toJSON();
    }
}

