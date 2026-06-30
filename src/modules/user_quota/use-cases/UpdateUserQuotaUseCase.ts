import { UserQuota } from "../../../models";
import { CreateUserQuotaInput } from "./CreateUserQuotaUseCase";

export class UpdateUserQuotaUseCase {
    async execute(userId: number, payload: Partial<CreateUserQuotaInput>) {
        const quota = await UserQuota.findOne({ where: { user_id: userId } });
        if (!quota) {
            throw new Error(`Quota untuk user ${userId} tidak ditemukan`);
        }
        await quota.update(payload);
        return quota.toJSON();
    }
}
