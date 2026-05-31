import {getRedisClient} from "../../config/redis_client";
import {PlanService} from "../plan/plan.service";
import {Op, Transaction} from "sequelize";
import {UserQuota} from "../../models";

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

        return true; // Diizinkan!
    }

    static async syncUserQuotaToDB(key: any, redis: any) {
        const userId = parseInt(key.split(':')[1]);
        const remainingQuotaStr = await redis.get(key);

        if (!remainingQuotaStr) return;
        const remainingQuota = parseInt(remainingQuotaStr);

        // Cari data kuota di database
        const userQuota = await UserQuota.findOne({where: {user_id: userId}});
        if (!userQuota) return;

        // Hitung pemakaian riil: Total dikurangi sisa di Redis
        const used = userQuota.total_quota - remainingQuota;

        // Update database
        userQuota.used_quota = used >= 0 ? used : 0; // Cegah angka minus
        await userQuota.save();

        console.log(`[Cron] User ${userId} tersinkronisasi. Terpakai: ${userQuota.used_quota}`);
    }

    static async getExpiredQuotas() {
        const today = new Date();
        const expiredQuotas = await UserQuota.findAll({
            where: {
                next_reset_date: {
                    [Op.lte]: today
                }
            }
        });
        return expiredQuotas.map(quota => quota.toJSON());
    }

    static async resetAndDowngradeQuota(userId: number, downgradeToFree: boolean = false) {
        const quota = await UserQuota.findOne({where: {user_id: userId}});
        if (!quota) {
            throw new Error(`Quota untuk user ${userId} tidak ditemukan`);
        }

        // 1. Reset pemakaian menjadi 0
        quota.used_quota = 0;

        // 2. Logika Downgrade (Jika Premium, kembalikan ke Free Tier)
        if (downgradeToFree && quota.total_quota > 10) {
            quota.total_quota = 10;
            // TODO: Anda bisa menambahkan logika update role 'user' menjadi 'free' di tabel Users sini

        }

        // 3. Tambahkan masa aktif 1 bulan ke depan untuk bulan berikutnya
        const nextMonth = new Date(quota.next_reset_date);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        quota.next_reset_date = nextMonth;

        await quota.save();
        return quota.toJSON();
    }

    static async resetRedisQuota(userId: number, newQuota: number) {
        const redis = getRedisClient();
        const redisKey = `user:${userId}:remaining_quota`;
        await redis.set(redisKey, newQuota.toString(), 'EX', 86400);
        return true;
    }

}

