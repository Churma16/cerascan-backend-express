import { getRedisClient } from "../../../config/redis_client";
import { UserQuota } from "../../../models";
import { getSocket } from "../../../config/websocket_client";

export class BroadcastUserLiveQuotaUseCase {
    async execute(userId: number | undefined) {
        if (!userId) {
            return null;
        }

        const redis = getRedisClient();
        const quotaKey = `user:${userId}:remaining_quota`;

        let currentQuota = await redis.get(quotaKey);

        if (currentQuota === null) {
            const userQuotaRecord = await UserQuota.findOne({
                where: { user_id: userId }
            });
            if (userQuotaRecord) {
                const remaining = userQuotaRecord.total_quota - userQuotaRecord.used_quota;
                currentQuota = remaining >= 0 ? remaining.toString() : '0';
                await redis.set(quotaKey, currentQuota, 'EX', 86400);
            } else {
                currentQuota = '0';
            }
        }

        // Kirimkan pembaruan ke klien via WebSocket
        const io = getSocket();
        io.to(`user_${userId}_quota_left`).emit("quota_update", currentQuota);

        return currentQuota;
    }
}
