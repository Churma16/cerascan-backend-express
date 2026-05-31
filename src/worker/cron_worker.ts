import cron from 'node-cron';
import {getRedisClient} from '../config/redis_client';
import {UserQuota} from "../models";
import {Op} from "sequelize";

export class CronWorker {
    static start() {
        // Jadwal: Berjalan setiap jam 23:59 setiap hari ('59 23 * * *')
        // Untuk testing, Anda bisa ubah ke '* * * * *' (berjalan setiap 1 menit)
        cron.schedule('59 23 * * *', async () => {
            console.log('🌙 [Cron] Memulai sinkronisasi pembukuan kuota...');
            const redis = getRedisClient();

            try {
                // ==========================================
                // TUGAS 1: SINKRONISASI REDIS KE POSTGRESQL
                // ==========================================
                // Ambil semua kunci di Redis yang mengandung sisa kuota
                // Catatan: Di production skala besar, gunakan SCAN alih-alih KEYS
                const keys = await redis.keys('user:*:remaining_quota');

                for (const key of keys) {
                    // Ekstrak userId dari string "user:1:remaining_quota"
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

                // ==========================================
                // TUGAS 2: RESET KERAS (USE IT OR LOSE IT)
                // ==========================================
                const today = new Date();

                // Cari pengguna yang tanggal reset-nya adalah HARI INI atau sudah terlewat
                const expiredQuotas = await UserQuota.findAll({
                    where: {
                        next_reset_date: {
                            [Op.lte]: today
                        }
                    }
                });

                for (const quota of expiredQuotas) {
                    console.log(`[Cron] Mereset kuota & masa aktif untuk User ${quota.user_id}...`);

                    // 1. Reset pemakaian menjadi 0
                    quota.used_quota = 0;

                    // 2. Logika Downgrade (Sesuaikan dengan aturan bisnis Anda)
                    // Jika total_quota > 10 (Premium), kembalikan ke Free Tier (10)
                    if (quota.total_quota > 10) {
                        quota.total_quota = 10;
                        // TODO: Anda bisa menambahkan logika update role 'user' menjadi 'free' di tabel Users sini
                    }

                    // 3. Tambahkan masa aktif 1 bulan ke depan untuk bulan berikutnya
                    const nextMonth = new Date(quota.next_reset_date);
                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                    quota.next_reset_date = nextMonth;

                    await quota.save();

                    // 4. TIMPA DATA REDIS LAMA
                    // Masukkan kembali total_quota yang baru ke Redis agar besok siap dipakai
                    const redisKey = `user:${quota.user_id}:remaining_quota`;
                    await redis.set(redisKey, quota.total_quota.toString(), 'EX', 86400);
                }

                console.log('[Cron] Tugas malam selesai. PostgreSQL dan Redis berhasil disinkronkan!');
            } catch (error) {
                console.error('[Cron] Terjadi kesalahan saat menjalankan tugas malam:', error);
            }
        });

        console.log('[Cron Worker] Penjadwalan aktif. Menunggu eksekusi pada jam 23:59...');
    }

    private static async syncUserQuotaToDB(key: any, redis: any) {
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
}