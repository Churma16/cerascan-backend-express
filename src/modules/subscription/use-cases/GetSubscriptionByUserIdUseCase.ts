import { Subscription, Plan, User, UserQuota } from "../../../models";

export class GetSubscriptionByUserIdUseCase {
    async execute(user_id: number | undefined) {
        const subscriptions = await Subscription.findAll({
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
