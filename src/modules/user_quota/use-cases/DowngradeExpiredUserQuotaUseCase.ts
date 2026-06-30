import { UserQuota } from "../../../models";
import { Op } from "sequelize";

export class DowngradeExpiredUserQuotaUseCase {
    async execute(redis: any) {
        const today = new Date();

        const expiredQuotas = await UserQuota.findAll({
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

            await UserQuota.bulkCreate(quotasToReset, {
                updateOnDuplicate: ['used_quota', 'total_quota', 'next_reset_date', 'updatedAt'] as any[]
            });

            await redisPipeline.exec();

            console.log(`[Cron] Berhasil mereset ${expiredQuotas.length} user secara massal.`);
        }
    }
}
