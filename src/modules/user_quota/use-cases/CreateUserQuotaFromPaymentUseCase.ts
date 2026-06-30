import { UserQuota } from "../../../models";
import { GetPlanByIdUseCase } from "../../plan/use-cases/GetPlanByIdUseCase";
import { Transaction } from "sequelize";

export class CreateUserQuotaFromPaymentUseCase {
    async execute(userId: number, planId: number, t?: Transaction) {
        const getPlanByIdUseCase = new GetPlanByIdUseCase();
        const selectedPlan = await getPlanByIdUseCase.execute(planId);
        const nextResetDate = new Date(Date.now() + selectedPlan.duration_days * 24 * 60 * 60 * 1000);

        const [userQuota] = await UserQuota.upsert({
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
