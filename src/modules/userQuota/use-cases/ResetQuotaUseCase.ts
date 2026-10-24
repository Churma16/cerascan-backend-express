import { UserPlanLifecycleService } from "../../../services/userPlanLifecycle.service";

export class ResetQuotaUseCase {
    async execute(userId: number) {
        const updatedQuota = await UserPlanLifecycleService.resetQuota(userId);
        return updatedQuota.toJSON();
    }
}
