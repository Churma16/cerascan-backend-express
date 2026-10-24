import { Transaction } from "sequelize";
import sequelize from "../config/databaseClient";
import { getRedisClient } from "../config/redisClient";
import { User, Plan, Subscription, UserQuotaModel } from "../models";
import { quotaService } from "./quota.service";
import { log } from "../utils/logger";

export interface AssignPlanOptions {
    acquisitionMethod?: string;
    note?: string;
    customDurationDays?: number;
    transaction?: Transaction;
}

export class UserPlanLifecycleService {
    /**
     * Menetapkan atau memperbarui paket pengguna (Free, Pro, Enterprise).
     * Mengelola sinkronisasi atomik pada:
     * 1. Tabel users (plan_id, sub_tier)
     * 2. Tabel subscriptions (membatalkan subscription lama, membuat subscription aktif baru)
     * 3. Tabel user_quotas (total_quota = plan.scan_quota, used_quota = 0, next_reset_date)
     * 4. Cache Redis (user:{userId}:remaining_quota)
     * 5. SSE live quota broadcast
     */
    static async assignPlan(
        userId: number,
        planId: number,
        options: AssignPlanOptions = {}
    ): Promise<{
        user: User;
        subscription: Subscription;
        userQuota: UserQuotaModel;
        remainingQuota: number;
    }> {
        const isExternalTransaction = !!options.transaction;
        const transactionInstance = options.transaction || (await sequelize.transaction());

        try {
            const selectedPlan = await Plan.findByPk(planId, {
                transaction: transactionInstance,
            });

            if (!selectedPlan) {
                throw new Error(`Plan dengan ID ${planId} tidak ditemukan.`);
            }

            const isFreePlan = selectedPlan.id === 1;
            const subscriptionTier: 'free' | 'paid' = isFreePlan ? 'free' : 'paid';

            const user = await User.findByPk(userId, {
                transaction: transactionInstance,
            });

            if (!user) {
                throw new Error(`Pengguna dengan ID ${userId} tidak ditemukan.`);
            }

            user.plan_id = selectedPlan.id;
            user.sub_tier = subscriptionTier;
            await user.save({ transaction: transactionInstance });

            const durationDays = options.customDurationDays || selectedPlan.duration_days || 30;
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + durationDays);

            await Subscription.update(
                { status: 'canceled' },
                {
                    where: {
                        user_id: userId,
                        status: 'active',
                    },
                    transaction: transactionInstance,
                }
            );

            const newSubscription = await Subscription.create(
                {
                    user_id: userId,
                    plan_id: selectedPlan.id,
                    status: 'active',
                    start_date: startDate,
                    end_date: endDate,
                    acquisition_method: options.acquisitionMethod || (isFreePlan ? 'free_registration' : 'midtrans_payment'),
                    note: options.note || (isFreePlan ? 'Default free plan' : 'Paid subscription plan'),
                },
                { transaction: transactionInstance }
            );

            const [userQuota] = await UserQuotaModel.upsert(
                {
                    user_id: userId,
                    total_quota: selectedPlan.scan_quota,
                    used_quota: 0,
                    next_reset_date: endDate,
                },
                {
                    transaction: transactionInstance,
                    returning: true,
                }
            );

            if (!isExternalTransaction) {
                await transactionInstance.commit();
            }

            const initialRemainingQuota = selectedPlan.scan_quota;
            try {
                const redis = getRedisClient();
                const quotaRedisKey = `user:${userId}:remaining_quota`;
                const redisTtlSeconds = Math.max(durationDays * 86400, 86400);

                await redis.set(quotaRedisKey, initialRemainingQuota.toString(), {
                    EX: redisTtlSeconds,
                });
            } catch (redisError) {
                log.error('UserPlanService', `Gagal mengupdate Redis cache kuota untuk user ${userId}:`, redisError);
            }


            quotaService.broadcastLiveQuota(userId).catch((broadcastError) => {
                log.error('UserPlanService', `Gagal memancarkan live quota untuk user ${userId}:`, broadcastError);
            });

            log.success(
                'UserPlanService',
                `Plan ${selectedPlan.name} (ID: ${selectedPlan.id}) berhasil diberikan kepada User ID ${userId}.`
            );

            return {
                user,
                subscription: newSubscription,
                userQuota,
                remainingQuota: initialRemainingQuota,
            };
        } catch (error) {
            if (!isExternalTransaction) {
                await transactionInstance.rollback();
            }
            throw error;
        }
    }

    /**
     * Mereset penggunaan kuota user kembali ke 0 dan menyinkronkan data ke Redis.
     */
    static async resetQuota(userId: number, transaction?: Transaction): Promise<UserQuotaModel> {
        const userQuota = await UserQuotaModel.findOne({
            where: { user_id: userId },
            transaction,
        });

        if (!userQuota) {
            throw new Error(`Data kuota untuk user ID ${userId} tidak ditemukan.`);
        }

        userQuota.used_quota = 0;
        await userQuota.save({ transaction });

        try {
            const redis = getRedisClient();
            const quotaRedisKey = `user:${userId}:remaining_quota`;
            await redis.set(quotaRedisKey, userQuota.total_quota.toString(), {
                EX: 86400,
            });
        } catch (redisError) {
            log.error('UserPlanService', `Gagal sinkronisasi reset kuota ke Redis untuk user ${userId}:`, redisError);
        }


        quotaService.broadcastLiveQuota(userId).catch(() => {});

        log.info('UserPlanService', `Kuota untuk user ID ${userId} berhasil direset (Used: 0 / Total: ${userQuota.total_quota}).`);
        return userQuota;
    }

    /**
     * Menyesuaikan total kuota user secara kustom dan menyinkronkan sisa kuota ke Redis.
     */
    static async updateCustomQuota(
        userId: number,
        newTotalQuota: number,
        newNextResetDate?: Date,
        transaction?: Transaction
    ): Promise<UserQuotaModel> {
        const userQuota = await UserQuotaModel.findOne({
            where: { user_id: userId },
            transaction,
        });

        if (!userQuota) {
            throw new Error(`Data kuota untuk user ID ${userId} tidak ditemukan.`);
        }

        userQuota.total_quota = newTotalQuota;
        if (newNextResetDate) {
            userQuota.next_reset_date = newNextResetDate;
        }
        await userQuota.save({ transaction });

        const calculatedRemaining = Math.max(userQuota.total_quota - userQuota.used_quota, 0);

        try {
            const redis = getRedisClient();
            const quotaRedisKey = `user:${userId}:remaining_quota`;
            await redis.set(quotaRedisKey, calculatedRemaining.toString(), {
                EX: 86400,
            });
        } catch (redisError) {
            log.error('UserPlanService', `Gagal sinkronisasi update custom kuota ke Redis untuk user ${userId}:`, redisError);
        }


        quotaService.broadcastLiveQuota(userId).catch(() => {});

        log.info('UserPlanService', `Total kuota user ID ${userId} diperbarui menjadi ${newTotalQuota} (Sisa: ${calculatedRemaining}).`);
        return userQuota;
    }

    /**
     * Menjalankan evaluasi berkala untuk langganan yang telah habis masa berlakunya.
     * Mengembalikan user berbayar yang kedaluwarsa ke Free Plan secara otomatis.
     */
    static async downgradeExpiredUsers(referenceDate: Date = new Date()): Promise<number> {
        const expiredSubscriptions = await Subscription.findAll({
            where: {
                status: 'active',
            },
        });

        let downgradedCount = 0;

        for (const subscription of expiredSubscriptions) {
            if (subscription.end_date && new Date(subscription.end_date) <= referenceDate) {
                if (subscription.plan_id > 1) {
                    try {
                        await this.assignPlan(subscription.user_id, 1, {
                            acquisitionMethod: 'cron_expired_downgrade',
                            note: 'Otomatis diturunkan ke Free Plan karena masa aktif habis',
                        });
                        downgradedCount++;
                        log.info(
                            'UserPlanService',
                            `User ID ${subscription.user_id} otomatis di-downgrade ke Free Plan karena masa aktif habis.`
                        );
                    } catch (downgradeError) {
                        log.error(
                            'UserPlanService',
                            `Gagal melakukan downgrade otomatis untuk user ${subscription.user_id}:`,
                            downgradeError
                        );
                    }
                } else {
                    try {
                        await this.resetQuota(subscription.user_id);
                        const updatedEndDate = new Date(referenceDate);
                        updatedEndDate.setDate(updatedEndDate.getDate() + 30);
                        subscription.end_date = updatedEndDate;
                        await subscription.save();
                    } catch (freeResetError) {
                        log.error(
                            'UserPlanService',
                            `Gagal mereset kuota bulanan Free Plan untuk user ${subscription.user_id}:`,
                            freeResetError
                        );
                    }
                }
            }
        }

        return downgradedCount;
    }
}
