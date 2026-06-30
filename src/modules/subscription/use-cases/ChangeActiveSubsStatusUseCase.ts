import { Transaction } from "sequelize";
import { ISubscriptionRepository } from "../domain/ISubscriptionRepository";
import { SequelizeSubscriptionRepository } from "../infrastructure/SequelizeSubscriptionRepository";

export class ChangeActiveSubsStatusUseCase {
    private subscriptionRepository: ISubscriptionRepository;

    constructor(subscriptionRepository: ISubscriptionRepository = new SequelizeSubscriptionRepository()) {
        this.subscriptionRepository = subscriptionRepository;
    }

    async execute(userId: number, status: "active" | "expired" | "canceled", t?: Transaction) {
        const subscriptions = await this.subscriptionRepository.update(
            { status: status }, {
                where: {
                    user_id: userId,
                    status: 'active'
                }, transaction: t
            }
        );
        return subscriptions;
    }
}
