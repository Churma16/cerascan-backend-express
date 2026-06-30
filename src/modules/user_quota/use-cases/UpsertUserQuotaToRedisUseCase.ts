import { getRedisClient } from "../../../config/redis_client";

export class UpsertUserQuotaToRedisUseCase {
    async execute(userId: number, planQuota: number) {
        const redis = getRedisClient();
        const userQuotaKey = `user:${userId}:remaining_quota`;
        const newQuotaKey = await redis.set(userQuotaKey, planQuota.toString(), 'EX', 86400);
        return newQuotaKey;
    }
}
