import { UserQuota } from "../../../models";

export class IncrementUsedQuotaUseCase {
    async execute(userId: number, amount: number) {
        const quota = await UserQuota.findOne({ where: { user_id: userId } });
        if (!quota) {
            throw new Error(`Quota untuk user ${userId} tidak ditemukan`);
        }
        const newUsedQuota = (quota.used_quota || 0) + amount;
        await quota.update({ used_quota: newUsedQuota });
        return quota.toJSON();
    }
}
