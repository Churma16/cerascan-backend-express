import { SequelizePlanRepository } from "../../plan/infrastructure/SequelizePlanRepository";

import { Transaction } from "sequelize";
import { IUserQuotaRepository } from "../domain/IUserQuotaRepository";
import { SequelizeUserQuotaRepository } from "../infrastructure/SequelizeUserQuotaRepository";

export class CreateUserQuotaFromPaymentUseCase {
    private userQuotaRepository: IUserQuotaRepository;

    constructor(userQuotaRepository: IUserQuotaRepository = new SequelizeUserQuotaRepository()) {
        this.userQuotaRepository = userQuotaRepository;
    }

    async execute(userId: number, planId: number, t?: Transaction) {
        const planRepository = new SequelizePlanRepository();
        const selectedPlan = await planRepository.findByPk(planId);
        if (!selectedPlan) throw new Error(`Plan dengan ID ${planId} tidak ditemukan`);
        const nextResetDate = new Date(Date.now() + selectedPlan.duration_days * 24 * 60 * 60 * 1000);

        const [userQuota] = await this.userQuotaRepository.upsert({
            user_id: userId,
            total_quota: selectedPlan.scan_quota,
            used_quota: 0,
            next_reset_date: nextResetDate,
        }, {
            transaction: t,
            returning: true
        });

        return userQuota.toJSON();
    }
}
