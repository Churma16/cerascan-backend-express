import { Subscription, Plan, User } from "../../../models";
import { getRemainingDurationString } from "../domain/subscription.domain";

export class GetActiveSubscriptionUseCase {
    async execute(userId: number | undefined) {
        console.log(userId);
        const subsDetail = await Subscription.findOne({
            where: {
                user_id: userId,
                status: 'active'
            },
            include: [
                {
                    model: Plan,
                    as: "plan"
                },
                {
                    model: User,
                    as: "user"
                }
            ],
            order: [
                ['createdAt', 'DESC']
            ]
        });

        if (!subsDetail) return null;

        const subsJson = subsDetail.toJSON() as any;
        subsJson.remaining_duration = getRemainingDurationString(subsJson.plan_id, new Date(subsJson.end_date));

        return subsJson;
    }
}
