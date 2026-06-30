import { Subscription } from "../../../models";
import { Op, Transaction } from "sequelize";

export class ExpireActiveSubscriptionsUseCase {
    async execute(today: Date, t?: Transaction) {
        const [affectedCount] = await Subscription.update(
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
