import { IUserQuotaRepository } from "../domain/IUserQuotaRepository";
import { SequelizeUserQuotaRepository } from "../infrastructure/SequelizeUserQuotaRepository";

export class IncrementUsedQuotaUseCase {
    private userQuotaRepository: IUserQuotaRepository;

    constructor(userQuotaRepository: IUserQuotaRepository = new SequelizeUserQuotaRepository()) {
        this.userQuotaRepository = userQuotaRepository;
    }

    async execute(userId: number, amount: number) {
        const quota = await this.userQuotaRepository.findOne({ where: { user_id: userId } });
        if (!quota) {
            throw new Error(`Quota untuk user ${userId} tidak ditemukan`);
        }
        const newUsedQuota = (quota.used_quota || 0) + amount;
        await this.userQuotaRepository.update(userId, { used_quota: newUsedQuota });
        
        const updatedQuota = await this.userQuotaRepository.findOne({ where: { user_id: userId } });
        return updatedQuota ? updatedQuota.toJSON() : quota.toJSON();
    }
}
