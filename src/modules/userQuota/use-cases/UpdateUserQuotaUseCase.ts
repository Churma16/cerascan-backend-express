import { IUserQuotaRepository } from "../domain/IUserQuotaRepository";
import { SequelizeUserQuotaRepository } from "../infrastructure/SequelizeUserQuotaRepository";
import { CreateUserQuotaInput } from "./CreateUserQuotaUseCase";
import { getRedisClient } from "../../../config/redisClient";
import { BroadcastUserLiveQuotaUseCase } from "./BroadcastUserLiveQuotaUseCase";
import { log } from "../../../utils/logger";

export class UpdateUserQuotaUseCase {
    private userQuotaRepository: IUserQuotaRepository;

    constructor(userQuotaRepository: IUserQuotaRepository = new SequelizeUserQuotaRepository()) {
        this.userQuotaRepository = userQuotaRepository;
    }

    async execute(userId: number, payload: Partial<CreateUserQuotaInput>) {
        const quota = await this.userQuotaRepository.findOne({ where: { user_id: userId } });
        if (!quota) {
            throw new Error(`Quota untuk user ${userId} tidak ditemukan`);
        }

        await this.userQuotaRepository.update(userId, payload);
        const updatedQuota = await this.userQuotaRepository.findOne({ where: { user_id: userId } });
        const quotaJSON = updatedQuota ? updatedQuota.toJSON() : quota.toJSON();

        const calculatedRemaining = Math.max(quotaJSON.total_quota - (quotaJSON.used_quota || 0), 0);

        try {
            const redis = getRedisClient();
            const quotaRedisKey = `user:${userId}:remaining_quota`;
            await redis.set(quotaRedisKey, calculatedRemaining.toString(), {
                EX: 86400,
            });
        } catch (redisError) {
            log.error('UpdateUserQuota', `Gagal sinkronisasi update kuota ke Redis untuk user ${userId}:`, redisError);
        }

        const broadcastUserLiveQuotaUseCase = new BroadcastUserLiveQuotaUseCase();
        broadcastUserLiveQuotaUseCase.execute(userId).catch(() => {});

        return quotaJSON;
    }
}
