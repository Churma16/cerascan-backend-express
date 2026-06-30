import { IUserQuotaRepository } from "../domain/IUserQuotaRepository";
import { SequelizeUserQuotaRepository } from "../infrastructure/SequelizeUserQuotaRepository";
import { CreateUserQuotaInput } from "./CreateUserQuotaUseCase";

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
        return updatedQuota ? updatedQuota.toJSON() : quota.toJSON();
    }
}
