import { Transaction } from "sequelize";
import { CreateSubscriptionUseCase } from "./CreateSubscriptionUseCase";
import { GetPlanByIdUseCase } from "../../plan/use-cases/GetPlanByIdUseCase";
import { CreateUserQuotaUseCase } from '../../userQuota/use-cases/CreateUserQuotaUseCase';
import { UpsertUserQuotaToRedisUseCase } from '../../userQuota/use-cases/UpsertUserQuotaToRedisUseCase';

export class InitiateFreePlanUseCase {
    async execute(userId: number, t?: Transaction) {
        const createSubscriptionUseCase = new CreateSubscriptionUseCase();
        const newSubscription = await createSubscriptionUseCase.execute(
            userId,
            1,
            'active',
            'free_plan_login',
            'default_plan_for_new_user',
            t
        );

        const getPlanByIdUseCase = new GetPlanByIdUseCase();
        const freePlan = await getPlanByIdUseCase.execute(1);
        if (!freePlan) {
            throw new Error('Free plan tidak ditemukan');
        }

        const userQuotaPayload: any = {
            user_id: userId,
            total_quota: freePlan.scan_quota,
            next_reset_date: new Date(new Date().setDate(new Date().getDate() + freePlan.duration_days))
        };

        const createUserQuotaUseCase = new CreateUserQuotaUseCase();
        const newUserQuota = await createUserQuotaUseCase.execute(userQuotaPayload, t);

        const upsertUserQuotaToRedisUseCase = new UpsertUserQuotaToRedisUseCase();
        const newQuotaRedis = await upsertUserQuotaToRedisUseCase.execute(userId, freePlan.scan_quota);

        return {
            newSubscription: newSubscription,
            newUserQuota: newUserQuota,
            newQuotaRedis: newQuotaRedis
        };
    }
}
