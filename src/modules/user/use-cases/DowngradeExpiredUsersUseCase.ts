import User from "../../../models/user.model";
import { Subscription } from "../../../models";
import { Op } from "sequelize";
import sequelize from "../../../config/database";
import { getNowIndonesiaTime } from "../../../utils/time.helper";
import { ExpireActiveSubscriptionsUseCase } from "../../subscription/use-cases/ExpireActiveSubscriptionsUseCase";

export class DowngradeExpiredUsersUseCase {
    async execute() {
        const today = getNowIndonesiaTime();

        return await sequelize.transaction(async (t) => {
            const expiredSubs = await Subscription.findAll({
                attributes: ['user_id'],
                where: {
                    status: 'active',
                    end_date: {
                        [Op.lte]: today
                    }
                },
                transaction: t
            });

            const userIds = expiredSubs.map(sub => sub.user_id);

            let updatedUsersCount = 0;
            if (userIds.length > 0) {
                [updatedUsersCount] = await User.update(
                    { plan_id: 1 },
                    {
                        where: { id: { [Op.in]: userIds } },
                        transaction: t
                    }
                );
            }

            const expireActiveSubscriptionsUseCase = new ExpireActiveSubscriptionsUseCase();
            const updatedSubsCount = await expireActiveSubscriptionsUseCase.execute(today, t);

            return { updatedUsersCount, updatedSubsCount };
        });
    }
}
