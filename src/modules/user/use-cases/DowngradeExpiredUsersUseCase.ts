import { UserPlanLifecycleService } from "../../../services/userPlanLifecycle.service";

export class DowngradeExpiredUsersUseCase {
    async execute(today: Date = new Date(), redis?: any) {
        const downgradedCount = await UserPlanLifecycleService.downgradeExpiredUsers(today);
        return { updatedUsersCount: downgradedCount, updatedSubsCount: downgradedCount };
    }
}
