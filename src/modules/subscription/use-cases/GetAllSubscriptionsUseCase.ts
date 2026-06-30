import { Plan, User, UserQuota } from "../../../models";
import { ISubscriptionRepository } from "../domain/ISubscriptionRepository";
import { SequelizeSubscriptionRepository } from "../infrastructure/SequelizeSubscriptionRepository";

export class GetAllSubscriptionsUseCase {
    private subscriptionRepository: ISubscriptionRepository;

    constructor(subscriptionRepository: ISubscriptionRepository = new SequelizeSubscriptionRepository()) {
        this.subscriptionRepository = subscriptionRepository;
    }

    async execute() {
        const subscriptions = await this.subscriptionRepository.findAll({
            where: { status: "active" },
            include: [
                {
                    model: Plan,
                    as: "plan"
                },
                {
                    model: User,
                    as: "user",
                    include: [
                        {
                            model: UserQuota,
                            as: "user_quota"
                        }
                    ]
                }
            ],
        });
        return subscriptions.map(subscription => subscription.toJSON());
    }
}
