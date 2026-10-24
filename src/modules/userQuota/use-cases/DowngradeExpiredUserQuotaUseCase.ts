import { UserPlanLifecycleService } from "../../../services/userPlanLifecycle.service";

export class DowngradeExpiredUserQuotaUseCase {
    async execute(redis?: any, today: Date = new Date()) {
        await UserPlanLifecycleService.downgradeExpiredUsers(today);
    }
}
