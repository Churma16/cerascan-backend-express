import { Plan, User, UserQuota } from "../../../models";
import { ISubscriptionRepository } from "../domain/ISubscriptionRepository";
import { SequelizeSubscriptionRepository } from "../infrastructure/SequelizeSubscriptionRepository";

export class GetSubscriptionByUserIdUseCase {
    private subscriptionRepository: ISubscriptionRepository;

    constructor(subscriptionRepository: ISubscriptionRepository = new SequelizeSubscriptionRepository()) {
        this.subscriptionRepository = subscriptionRepository;
    }

    async execute(user_id: number | undefined) {
        const subscriptions = await this.subscriptionRepository.findAll({
            where: { user_id },
            include: [
                {
                    model: Plan,
                    as: 'plan'
                },
                {
                    model: User,
                    as: 'user',
                    include: [
                        {
                            model: UserQuota,
                            as: "user_quota"
                        }
                    ]
                }
            ],
            order: [
                ['createdAt', 'DESC']
            ]
        });
        return subscriptions.map(subscription => subscription.toJSON());
    }
}
