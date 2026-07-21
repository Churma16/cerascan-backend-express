import { getRedisClient } from "../../../config/redisClient";
import { BroadcastUserLiveQuotaUseCase } from "./BroadcastUserLiveQuotaUseCase";
import { IUserQuotaRepository } from "../domain/IUserQuotaRepository";
import { SequelizeUserQuotaRepository } from "../infrastructure/SequelizeUserQuotaRepository";

export class CheckAndDecrementQuotaUseCase {
    private userQuotaRepository: IUserQuotaRepository;

    constructor(userQuotaRepository: IUserQuotaRepository = new SequelizeUserQuotaRepository()) {
        this.userQuotaRepository = userQuotaRepository;
    }

    async execute(userId: number | undefined, totalImages: number = 1): Promise<boolean> {
        const redis = getRedisClient();
        const quotaKey = `user:${userId}:remaining_quota`;

        let currentQuota = await redis.get(quotaKey);

        if (currentQuota === null) {
            const userQuotaRecord = await this.userQuotaRepository.findOne({
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

        const broadcastUserLiveQuotaUseCase = new BroadcastUserLiveQuotaUseCase(this.userQuotaRepository);
        broadcastUserLiveQuotaUseCase.execute(userId).catch(err => {
            console.error('[Quota] Gagal memancarkan update kuota live:', err);
        });

        return true;
    }
}
