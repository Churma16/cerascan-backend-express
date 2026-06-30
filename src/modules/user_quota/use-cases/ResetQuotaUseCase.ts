import { UserQuota } from "../../../models";

export class ResetQuotaUseCase {
    async execute(userId: number) {
        const quota = await UserQuota.findOne({ where: { user_id: userId } });
        if (!quota) {
            throw new Error(`Quota untuk user ${userId} tidak ditemukan`);
        }
        await quota.update({ used_quota: 0 });
        return quota.toJSON();
    }
}
