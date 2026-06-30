import { getRedisClient } from "../../../config/redis_client";
import { UserQuota } from "../../../models";
import { calculateUsedQuota } from "../domain/user_quota.domain";

export class GetUserQuotaByUserIdUseCase {
    async execute(userId: number) {
        const redis = getRedisClient();
        const userQuotaKey = `user:${userId}:remaining_quota`;
        const remainingQuota = await redis.get(userQuotaKey);

        const quota = await UserQuota.findOne({ where: { user_id: userId } });
        if (!quota) {
            throw new Error(`Quota untuk user ${userId} tidak ditemukan`);
        }

        const quotaJSON = quota.toJSON();
        if (remainingQuota !== null && remainingQuota !== undefined) {
            const remaining = parseInt(remainingQuota);
            quotaJSON.used_quota = calculateUsedQuota(quotaJSON.total_quota, remaining);
        } else {
            const remaining = quota.total_quota - quota.used_quota;
            await redis.set(userQuotaKey, remaining >= 0 ? remaining.toString() : '0', 'EX', 86400);
        }

        return quotaJSON;
    }
}
