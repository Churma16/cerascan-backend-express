import { Plan, User } from "../../../models";
import { getRemainingDurationString } from "../domain/subscription.domain";
import { ISubscriptionRepository } from "../domain/ISubscriptionRepository";
import { SequelizeSubscriptionRepository } from "../infrastructure/SequelizeSubscriptionRepository";

export class GetActiveSubscriptionUseCase {
    private subscriptionRepository: ISubscriptionRepository;

    constructor(subscriptionRepository: ISubscriptionRepository = new SequelizeSubscriptionRepository()) {
        this.subscriptionRepository = subscriptionRepository;
    }

    async execute(userId: number | undefined) {
        console.log(userId);
        const subsDetail = await this.subscriptionRepository.findOne({
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
