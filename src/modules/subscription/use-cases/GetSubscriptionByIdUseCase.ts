import { Subscription } from "../../../models";

export class GetSubscriptionByIdUseCase {
    async execute(id: number) {
        const subscription = await Subscription.findByPk(id);
        if (!subscription) {
            throw new Error(`Subscription dengan ID ${id} tidak ditemukan`);
        }
        return subscription.toJSON();
    }
}
