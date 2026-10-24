import { Transaction } from "sequelize";
import { UserPlanLifecycleService } from "../../../services/userPlanLifecycle.service";

export class InitiateFreePlanUseCase {
    async execute(userId: number, t?: Transaction) {
        const result = await UserPlanLifecycleService.assignPlan(userId, 1, {
            acquisitionMethod: 'free_plan_initiate',
            note: 'Free plan default inisiasi',
            transaction: t,
        });

        return {
            newSubscription: result.subscription,
            newUserQuota: result.userQuota,
            newQuotaRedis: result.remainingQuota,
        };
    }
}
