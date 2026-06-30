import { getRedisClient } from "../../../config/redis_client";
import { calculateUsedQuota } from "../domain/user_quota.domain";
import { IUserQuotaRepository } from "../domain/IUserQuotaRepository";
import { SequelizeUserQuotaRepository } from "../infrastructure/SequelizeUserQuotaRepository";

export class GetUserQuotaByUserIdUseCase {
    private userQuotaRepository: IUserQuotaRepository;

    constructor(userQuotaRepository: IUserQuotaRepository = new SequelizeUserQuotaRepository()) {
        this.userQuotaRepository = userQuotaRepository;
    }

    async execute(userId: number) {
        const redis = getRedisClient();
        const userQuotaKey = `user:${userId}:remaining_quota`;

        const userQuota = await this.userQuotaRepository.findOne({
            where: { user_id: userId }
        });

        if (!userQuota) return null;

        let remainingQuotaStr = await redis.get(userQuotaKey);

        if (remainingQuotaStr === null) {
            const calculatedRemaining = userQuota.total_quota - userQuota.used_quota;
            remainingQuotaStr = calculatedRemaining >= 0 ? calculatedRemaining.toString() : '0';
            await redis.set(userQuotaKey, remainingQuotaStr, 'EX', 86400);
        }

        const remainingQuota = parseInt(remainingQuotaStr);
        const usedQuota = calculateUsedQuota(userQuota.total_quota, remainingQuota);

        return {
            total_quota: userQuota.total_quota,
            used_quota: usedQuota,
            next_reset_date: userQuota.next_reset_date,
        };
    }
}
