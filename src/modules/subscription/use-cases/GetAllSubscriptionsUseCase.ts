import { Subscription, Plan, User, UserQuota } from "../../../models";

export class GetAllSubscriptionsUseCase {
    async execute() {
        const subscriptions = await Subscription.findAll({
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
