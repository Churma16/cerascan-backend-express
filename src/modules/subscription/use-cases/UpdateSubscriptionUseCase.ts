import { ISubscriptionRepository } from "../domain/ISubscriptionRepository";
import { SequelizeSubscriptionRepository } from "../infrastructure/SequelizeSubscriptionRepository";
import { SubscriptionPayload } from "./CreateSubscriptionUseCase";

export class UpdateSubscriptionUseCase {
    private subscriptionRepository: ISubscriptionRepository;

    constructor(subscriptionRepository: ISubscriptionRepository = new SequelizeSubscriptionRepository()) {
        this.subscriptionRepository = subscriptionRepository;
    }

    async execute(id: number, payload: Partial<SubscriptionPayload>) {
        const subscription = await this.subscriptionRepository.findByPk(id);
        if (!subscription) {
            throw new Error(`Subscription dengan ID ${id} tidak ditemukan`);
        }
        await this.subscriptionRepository.update(payload, { where: { id } });
        
        const updatedSubscription = await this.subscriptionRepository.findByPk(id);
        return updatedSubscription ? updatedSubscription.toJSON() : subscription.toJSON();
    }
}
