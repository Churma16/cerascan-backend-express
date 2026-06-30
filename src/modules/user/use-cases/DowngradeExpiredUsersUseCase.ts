import { Subscription } from "../../../models";
import { Op } from "sequelize";
import sequelize from "../../../config/database";
import { getNowIndonesiaTime } from "../../../utils/time.helper";
import { ExpireActiveSubscriptionsUseCase } from "../../subscription/use-cases/ExpireActiveSubscriptionsUseCase";
import { IUserRepository } from "../domain/IUserRepository";
import { SequelizeUserRepository } from "../infrastructure/SequelizeUserRepository";

export class DowngradeExpiredUsersUseCase {
    private userRepository: IUserRepository;

    constructor(userRepository: IUserRepository = new SequelizeUserRepository()) {
        this.userRepository = userRepository;
    }

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
                updatedUsersCount = await this.userRepository.bulkUpdatePlan(userIds, 1, t);
            }

            const expireActiveSubscriptionsUseCase = new ExpireActiveSubscriptionsUseCase();
            const updatedSubsCount = await expireActiveSubscriptionsUseCase.execute(today, t);

            return { updatedUsersCount, updatedSubsCount };
        });
    }
}
