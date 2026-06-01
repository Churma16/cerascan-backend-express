import {getRedisClient} from "../../config/redis_client";
import {PlanService} from "../plan/plan.service";
import {Op, Transaction} from "sequelize";
import {UserQuota} from "../../models";
import {getSocket} from "../../config/websocket_client";

export interface UserQuotaPayload {
    user_id: number;
    total_quota: number;
    used_quota?: number;
    next_reset_date?: Date;
}

export class UserQuotaService {
    static async createUserQuota(payload: UserQuotaPayload) {
        const newQuota = await UserQuota.create({
            ...payload,
            used_quota: payload.used_quota || 0,
        });
        return newQuota.toJSON();
    }

    static async createUserQuotaFromPayment(userId: number, planId: number, t?: Transaction) {
        const selectedPlan = await PlanService.getPlanById(planId);

        const nextResetDate = new Date(Date.now() + selectedPlan.duration_days * 24 * 60 * 60 * 1000);

        const newQuota = await UserQuota.create({
            user_id: userId,
            total_quota: selectedPlan.scan_quota,
            used_quota: 0,
            next_reset_date: nextResetDate,
        }, {transaction: t});

        return newQuota.toJSON();
    }

    static async getUserQuotaByUserId(user_id: number) {
        const quota = await UserQuota.findOne({where: {user_id}});
        if (!quota) {
            throw new Error(`Quota untuk user ${user_id} tidak ditemukan`);
        }
        return quota.toJSON();
    }

    static async updateUserQuota(user_id: number, payload: Partial<UserQuotaPayload>) {
        const quota = await UserQuota.findOne({where: {user_id}});
        if (!quota) {
            throw new Error(`Quota untuk user ${user_id} tidak ditemukan`);
        }
        await quota.update(payload);
        return quota.toJSON();
    }

    static async incrementUsedQuota(user_id: number, amount: number) {
        const quota = await UserQuota.findOne({where: {user_id}});
        if (!quota) {
            throw new Error(`Quota untuk user ${user_id} tidak ditemukan`);
        }
        const newUsedQuota = (quota.used_quota || 0) + amount;
        await quota.update({used_quota: newUsedQuota});
        return quota.toJSON();
    }

    static async resetQuota(user_id: number) {
        const quota = await UserQuota.findOne({where: {user_id}});
        if (!quota) {
            throw new Error(`Quota untuk user ${user_id} tidak ditemukan`);
        }
        await quota.update({used_quota: 0});
        return quota.toJSON();
    }

    static async checkAndDecrementQuota(userId: number | undefined, totalImages: number = 1): Promise<boolean> {
        const redis = getRedisClient();
        const quotaKey = `user:${userId}:remaining_quota`;

        // 1. Cek saldo saat ini di Redis
        let currentQuota = await redis.get(quotaKey);

        // 2. CACHE MISS: Data tidak ada di Redis
        if (currentQuota === null) {
            // Tarik data asli dari PostgreSQL
            const userQuotaRecord = await UserQuota.findOne({
                where: {user_id: userId}
            });

            if (!userQuotaRecord) {
                console.error(`[Quota] Record kuota tidak ditemukan untuk user ${userId}`);
                return false; // Tolak akses jika data kuota belum dibuat
            }

            // Hitung sisa kuota riil (Total - Terpakai)
            const remaining = userQuotaRecord.total_quota - userQuotaRecord.used_quota;
            currentQuota = remaining.toString();

            // Simpan ke Redis dengan waktu kedaluwarsa 24 jam (86400 detik)
            // agar memori Redis tidak penuh oleh user yang sudah tidak aktif
            await redis.set(quotaKey, currentQuota, 'EX', 86400);
        }

        // 3. Validasi: Apakah sisa kuota cukup untuk batch scan ini?
        if (parseInt(currentQuota) < totalImages) {
            return false; // Ditolak!
        }

        // 4. EKSEKUSI: Potong saldo di Redis secara Atomic
        // Operasi ini kebal dari race condition walau ditembak ribuan request bersamaan
        await redis.decrBy(quotaKey, totalImages);

        this.broadcastCurrentUserLiveQuota(userId).catch(err => {
            console.error('[Quota] Gagal memancarkan update kuota live:', err);
        });

        return true;
    }

    static async syncUserQuotaToDB(redis: any) {
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
                    where: {user_id: {[Op.in]: userIds}}
                });

                const quotasToUpdate: any[] = [];

                for (const userQuota of userQuotas) {
                    const remainingQuota = quotaMap.get(userQuota.user_id);
                    if (remainingQuota !== undefined) {
                        const used = userQuota.total_quota - remainingQuota;
                        quotasToUpdate.push({
                            id: userQuota.id,
                            user_id: userQuota.user_id,
                            used_quota: used >= 0 ? used : 0
                        });
                    }
                }

                if (quotasToUpdate.length > 0) {
                    await UserQuota.bulkCreate(quotasToUpdate, {
                        updateOnDuplicate: ['used_quota']
                    });
                    console.log(`[Cron] Berhasil mensinkronisasi ${quotasToUpdate.length} data user.`);
                }
            }
        }
    }
    static async downgradeExpiredUserQuota(redis: any) {
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
            const redisPipeline = redis.multi(); // Buka jalur khusus ke Redis untuk antrean tugas

            for (const quota of expiredQuotas) {
                let newTotalQuota = quota.total_quota;

                if (quota.total_quota > 10) {
                    newTotalQuota = 10;
                    // TODO: Anda bisa menambahkan logika update role 'user' menjadi 'free' di tabel Users
                    // sini
                }

                const nextMonth = new Date(quota.next_reset_date);
                nextMonth.setMonth(nextMonth.getMonth() + 1);

                // Kumpulkan data untuk update massal DB
                quotasToReset.push({
                    id: quota.id,
                    user_id: quota.user_id,
                    used_quota: 0,
                    total_quota: newTotalQuota,
                    next_reset_date: nextMonth
                });

                // Titipkan perintah set ke antrean Redis Pipeline
                const redisKey = `user:${quota.user_id}:remaining_quota`;
                redisPipeline.set(redisKey, newTotalQuota.toString(), 'EX', 86400);
            }

            await UserQuota.bulkCreate(quotasToReset, {
                updateOnDuplicate: ['used_quota', 'total_quota', 'next_reset_date']
            });

            await redisPipeline.exec();

            console.log(`[Cron] Berhasil mereset ${quotasToReset.length} user secara massal.`);
        }
    }

    static async broadcastCurrentUserLiveQuota(userId: number | undefined) {
        if (!userId) {
            return null; // Mencegah pencarian key 'user:undefined:remaining_quota'
        }

        const redis = getRedisClient();
        const quotaKey = `user:${userId}:remaining_quota`;

        let currentQuota = await redis.get(quotaKey);

        // Kirimkan pembaruan ke klien via WebSocket
        const io = getSocket();
        io.to(`user_${userId}_quota_left`).emit("quota_update", currentQuota);

        return currentQuota;
    }

}

