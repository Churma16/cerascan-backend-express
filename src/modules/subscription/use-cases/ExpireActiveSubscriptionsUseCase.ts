import { Op, Transaction } from "sequelize";
import { ISubscriptionRepository } from "../domain/ISubscriptionRepository";
import { SequelizeSubscriptionRepository } from "../infrastructure/SequelizeSubscriptionRepository";

export class ExpireActiveSubscriptionsUseCase {
    private subscriptionRepository: ISubscriptionRepository;

    constructor(subscriptionRepository: ISubscriptionRepository = new SequelizeSubscriptionRepository()) {
        this.subscriptionRepository = subscriptionRepository;
    }

    async execute(today: Date, t?: Transaction) {
        const affectedCount = await this.subscriptionRepository.update(
            { status: 'expired' },
            {
                where: {
                    end_date: { [Op.lte]: today },
                    status: 'active'
                },
                transaction: t
            }
        );
        return affectedCount;
    }
}
