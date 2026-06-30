import { UserQuota } from "../../../models";
import { Op } from "sequelize";

export class SyncUserQuotaToDbUseCase {
    async execute(redis: any) {
        const keys = await redis.keys('user:*:remaining_quota');

        if (keys && keys.length > 0) {
            const redisValues = await redis.mGet(keys);
            const quotaMap = new Map();
            const userIds: number[] = [];

            keys.forEach((key: string, index: number) => {
                const value = redisValues[index];
                if (value !== null && value !== undefined) {
                    const userId = parseInt(key.split(':')[1]);
                    quotaMap.set(userId, parseInt(value as string));
                    userIds.push(userId);
                }
            });

            if (userIds.length > 0) {
                const userQuotas = await UserQuota.findAll({
                    where: { user_id: { [Op.in]: userIds } }
                });

                const quotasToUpdate: any[] = [];

                for (const userQuota of userQuotas) {
                    const remainingQuota = quotaMap.get(userQuota.user_id);
                    if (remainingQuota !== undefined) {
                        const used = userQuota.total_quota - remainingQuota;
                        quotasToUpdate.push({
                            id: userQuota.id,
                            user_id: userQuota.user_id,
                            total_quota: userQuota.total_quota,
                            used_quota: used >= 0 ? used : 0
                        });
                    }
                }

                if (quotasToUpdate.length > 0) {
                    await UserQuota.bulkCreate(quotasToUpdate, {
                        updateOnDuplicate: ['used_quota', 'updatedAt'] as any[]
                    });
                    console.log(`[Cron] Berhasil mensinkronisasi ${quotasToUpdate.length} data user.`);
                }
            }
        }
    }
}
