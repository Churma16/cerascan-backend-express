import cron from 'node-cron';
import {getRedisClient} from '../config/redis_client';
import {UserQuotaService} from "../modules/user_quota/user_quota.service";
import {LeaderboardArchive} from "../models";

export class CronWorker {
    static start() {
        cron.schedule('59 23 * * *', async () => {
            console.log('🌙 [Cron] Memulai sinkronisasi pembukuan kuota...');
            const redis = getRedisClient();

            try {
                // ==========================================
                // TUGAS 1: SINKRONISASI REDIS KE POSTGRESQL
                // (Kode Tugas 1 Anda sudah benar dan dipertahankan di sini)
                // ==========================================
                await UserQuotaService.syncUserQuotaToDB(redis);

                // ==========================================
                // TUGAS 2: RESET KERAS (USE IT OR LOSE IT) - OPTIMIZED
                // ==========================================
                await UserQuotaService.downgradeExpiredUserQuota(redis);

                console.log('📊 [Cron] Mengeksekusi Tugas 3: Backup Papan Peringkat...');
                const currentMonth = new Date().toISOString().slice(0, 7); // Format: "YYYY-MM"
                const rankKey = `leaderboard:rank:${currentMonth}`;

                // Ambil semua pengguna dari ZSET tanpa batas (0 sampai -1)
                const allScorerIds = await redis.zrevrange(rankKey, 0, -1);

                for (const userIdStr of allScorerIds) {
                    const userId = parseInt(userIdStr);
                    const statsKey = `leaderboard:stats:${currentMonth}:user:${userId}`;

                    // Ambil detail cacat dan total dari HASH
                    const stats = await redis.hgetall(statsKey);
                    const totalScans = parseInt(stats.total_scans || '0');
                    const defectScans = parseInt(stats.defect_scans || '0');

                    // Cari apakah datanya sudah ada di MySQL untuk bulan ini
                    const [record, created] = await LeaderboardArchive.findOrCreate({
                        where: {user_id: userId, period: currentMonth},
                        defaults: {
                            user_id: userId,
                            period: currentMonth,
                            total_scans: totalScans,
                            defect_scans: defectScans
                        }
                    });

                    // Jika sudah pernah dibuat di malam sebelumnya, perbarui (Update) angkanya
                    if (!created) {
                        record.total_scans = totalScans;
                        record.defect_scans = defectScans;
                        await record.save();
                    }
                }
                console.log(`✅ [Cron] Tugas 3 Selesai. ${allScorerIds.length} rekor leaderboard diamankan ke MySQL.`);
                console.log('[Cron] Tugas malam selesai. PostgreSQL dan Redis berhasil disinkronkan!');
            } catch (error) {
                console.error('[Cron] Terjadi kesalahan saat menjalankan tugas malam:', error);
            }
        });

        console.log('[Cron Worker] Penjadwalan aktif. Menunggu eksekusi pada jam 23:59...');
    }
}