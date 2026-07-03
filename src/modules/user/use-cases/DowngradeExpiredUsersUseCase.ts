import { Op } from "sequelize";
import sequelize from "../../../config/database";
import { getNowIndonesiaTime } from "../../../utils/time.helper";
import { ExpireActiveSubscriptionsUseCase } from "../../subscription/use-cases/ExpireActiveSubscriptionsUseCase";
import { IUserRepository } from "../domain/IUserRepository";
import { SequelizeUserRepository } from "../infrastructure/SequelizeUserRepository";
import { SequelizeSubscriptionRepository } from "../../subscription/infrastructure/SequelizeSubscriptionRepository";
import UserQuota from "../../../models/user_quota.model";

export class DowngradeExpiredUsersUseCase {
    private userRepository: IUserRepository;

    constructor(userRepository: IUserRepository = new SequelizeUserRepository()) {
        this.userRepository = userRepository;
    }

    async execute(today: Date, redis: any) {
        return await sequelize.transaction(async (t) => {
            const subscriptionRepository = new SequelizeSubscriptionRepository();
            const expiredSubs = await subscriptionRepository.findAll({
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
                
                // FORCED QUOTA DOWNGRADE
                await UserQuota.update(
                    { total_quota: 10 },
                    {
                        where: { user_id: { [Op.in]: userIds } },
                        transaction: t
                    }
                );
                
                // Update in Redis
                if (redis) {
                    const pipeline = redis.multi();
                    userIds.forEach(uid => {
                        pipeline.set(`user:${uid}:remaining_quota`, "10", 'EX', 86400);
                    });
                    await pipeline.exec();
                    console.log(`[Cron] Forced Downgrade Quota berhasil dieksekusi untuk ${userIds.length} user yang paketnya kedaluwarsa hari ini.`);
                }
            }

            const expireActiveSubscriptionsUseCase = new ExpireActiveSubscriptionsUseCase();
            const updatedSubsCount = await expireActiveSubscriptionsUseCase.execute(today, t);

            return { updatedUsersCount, updatedSubsCount };
        });
    }
}
