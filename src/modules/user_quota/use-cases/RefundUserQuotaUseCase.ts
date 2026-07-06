import { getRedisClient } from "../../../config/redisClient";
import { BroadcastUserLiveQuotaUseCase } from "./BroadcastUserLiveQuotaUseCase";

export class RefundUserQuotaUseCase {
    async execute(userId: number | undefined): Promise<void> {
        if (!userId) {
            return;
        }

        try {
            const redis = getRedisClient();
            const quotaKey = `user:${userId}:remaining_quota`;

            const currentQuota = await redis.get(quotaKey);
            
            if (currentQuota !== null) {
                await redis.incrBy(quotaKey, 1);
            }

            const broadcastUserLiveQuotaUseCase = new BroadcastUserLiveQuotaUseCase();
            await broadcastUserLiveQuotaUseCase.execute(userId);

        } catch (error) {
            console.error(`[Refund Quota] Gagal mengembalikan kuota untuk user ${userId}:`, error);
        }
    }
}
