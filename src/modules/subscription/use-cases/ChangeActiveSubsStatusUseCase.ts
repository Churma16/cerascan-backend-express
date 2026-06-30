import { Subscription } from "../../../models";
import { Transaction } from "sequelize";

export class ChangeActiveSubsStatusUseCase {
    async execute(userId: number, status: "active" | "expired" | "canceled", t?: Transaction) {
        const subscriptions = await Subscription.update(
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
