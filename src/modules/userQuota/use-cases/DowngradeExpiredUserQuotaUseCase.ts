import { Op } from "sequelize";
import { IUserQuotaRepository } from "../domain/IUserQuotaRepository";
import { SequelizeUserQuotaRepository } from "../infrastructure/SequelizeUserQuotaRepository";

export class DowngradeExpiredUserQuotaUseCase {
    private userQuotaRepository: IUserQuotaRepository;

    constructor(userQuotaRepository: IUserQuotaRepository = new SequelizeUserQuotaRepository()) {
        this.userQuotaRepository = userQuotaRepository;
    }

    async execute(redis: any, today: Date) {

        const expiredQuotas = await this.userQuotaRepository.findAll({
            where: {
                next_reset_date: {
                    [Op.lte]: today
                }
            }
        });

        if (expiredQuotas.length > 0) {
            const quotasToReset: any[] = [];
            const redisPipeline = redis.multi();

            for (const quota of expiredQuotas) {
                let newTotalQuota = quota.total_quota;

                if (quota.total_quota > 10) {
                    newTotalQuota = 10;
                }

                const nextMonth = new Date(quota.next_reset_date);
                nextMonth.setMonth(nextMonth.getMonth() + 1);

                quotasToReset.push({
                    id: quota.id,
                    user_id: quota.user_id,
                    used_quota: 0,
                    total_quota: newTotalQuota,
                    next_reset_date: nextMonth
                });

                const redisKey = `user:${quota.user_id}:remaining_quota`;
                redisPipeline.set(redisKey, newTotalQuota.toString(), 'EX', 86400);
            }

            await this.userQuotaRepository.bulkCreate(quotasToReset, {
                updateOnDuplicate: ['used_quota', 'total_quota', 'next_reset_date', 'updatedAt']
            });

            await redisPipeline.exec();

            console.log(`[Cron] Berhasil mereset ${expiredQuotas.length} user secara massal.`);
        }
    }
}
