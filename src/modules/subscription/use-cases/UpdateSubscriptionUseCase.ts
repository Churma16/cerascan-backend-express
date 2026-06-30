import { Subscription } from "../../../models";
import { SubscriptionPayload } from "./CreateSubscriptionUseCase";

export class UpdateSubscriptionUseCase {
    async execute(id: number, payload: Partial<SubscriptionPayload>) {
        const subscription = await Subscription.findByPk(id);
        if (!subscription) {
            throw new Error(`Subscription dengan ID ${id} tidak ditemukan`);
        }
        await subscription.update(payload);
        return subscription.toJSON();
    }
}
