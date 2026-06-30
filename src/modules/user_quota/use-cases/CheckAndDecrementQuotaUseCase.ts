import { getRedisClient } from "../../../config/redis_client";
import { UserQuota } from "../../../models";
import { BroadcastUserLiveQuotaUseCase } from "./BroadcastUserLiveQuotaUseCase";

export class CheckAndDecrementQuotaUseCase {
    async execute(userId: number | undefined, totalImages: number = 1): Promise<boolean> {
        const redis = getRedisClient();
        const quotaKey = `user:${userId}:remaining_quota`;

        let currentQuota = await redis.get(quotaKey);

        if (currentQuota === null) {
            const userQuotaRecord = await UserQuota.findOne({
                where: { user_id: userId }
            });

            if (!userQuotaRecord) {
                console.error(`[Quota] Record kuota tidak ditemukan untuk user ${userId}`);
                return false;
            }

            const remaining = userQuotaRecord.total_quota - userQuotaRecord.used_quota;
            currentQuota = remaining.toString();

            await redis.set(quotaKey, currentQuota, 'EX', 86400);
        }

        if (parseInt(currentQuota) < totalImages) {
            return false;
        }

        await redis.decrBy(quotaKey, totalImages);

        const broadcastUserLiveQuotaUseCase = new BroadcastUserLiveQuotaUseCase();
        broadcastUserLiveQuotaUseCase.execute(userId).catch(err => {
            console.error('[Quota] Gagal memancarkan update kuota live:', err);
        });

        return true;
    }
}
