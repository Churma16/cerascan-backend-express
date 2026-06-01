import cron from 'node-cron';
import {getRedisClient} from '../config/redis_client';
import {UserQuotaService} from "../modules/user_quota/user_quota.service";
import {LeaderboardService} from "../modules/leaderboard/leaderboard.service";
import {UserService} from "../modules/user/user.service";

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
                await UserService.downgradeAllExpiredUsers()

                await UserQuotaService.downgradeExpiredUserQuota(redis);


                await LeaderboardService.syncLeaderboardDataToDb(redis);

                console.log('[Cron] Tugas malam selesai. PostgreSQL/MySQL dan Redis berhasil disinkronkan!');
            } catch (error) {
                console.error('[Cron] Terjadi kesalahan saat menjalankan tugas malam:', error);
            }
        });

        console.log('[Cron Worker] Penjadwalan aktif. Menunggu eksekusi pada jam 23:59...');
    }


}