import { getRedisClient } from "../../../config/redisClient";
import { getSocket } from "../../../config/websocketClient";
import { sseClient } from "../../../config/sseClient";
import { IUserQuotaRepository } from "../domain/IUserQuotaRepository";
import { SequelizeUserQuotaRepository } from "../infrastructure/SequelizeUserQuotaRepository";

export class BroadcastUserLiveQuotaUseCase {
    private userQuotaRepository: IUserQuotaRepository;

    constructor(userQuotaRepository: IUserQuotaRepository = new SequelizeUserQuotaRepository()) {
        this.userQuotaRepository = userQuotaRepository;
    }

    async execute(userId: number | undefined) {
        if (!userId) {
            return null;
        }

        const redis = getRedisClient();
        const quotaKey = `user:${userId}:remaining_quota`;

        let currentQuota = await redis.get(quotaKey);

        if (currentQuota === null) {
            const userQuotaRecord = await this.userQuotaRepository.findOne({
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

        const io = getSocket();
        
        // Tetap pancarkan via WebSocket (bila perlu untuk kompatibilitas lama)
        io.to(`user_${userId}_quota_left`).emit("quota_update", currentQuota);

        // Pancarkan juga via SSE (untuk sistem baru)
        sseClient.emitToUser(userId.toString(), "quota_update", currentQuota);

        return currentQuota;
    }
}
