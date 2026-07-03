import cron from 'node-cron';
import {getRedisClient} from '../config/redis_client';
import { SyncUserQuotaToDbUseCase } from "../modules/user_quota/use-cases/SyncUserQuotaToDbUseCase";
import { DowngradeExpiredUserQuotaUseCase } from "../modules/user_quota/use-cases/DowngradeExpiredUserQuotaUseCase";
import { SyncLeaderboardToDbUseCase } from "../modules/leaderboard/use-cases/SyncLeaderboardToDbUseCase";
import { DowngradeExpiredUsersUseCase } from "../modules/user/use-cases/DowngradeExpiredUsersUseCase";
import { log } from "../utils/logger";

export class CronWorker {
    static start() {
        cron.schedule('59 23 * * *', async () => {
            log.info('Cron', '🌙 Memulai sinkronisasi pembukuan kuota...');
            const redis = getRedisClient();

            try {
                // Ambil referensi waktu hari ini (berkat TZ='Asia/Jakarta', new Date() aman)
                const today = new Date();

                // TUGAS 1: SINKRONISASI REDIS KE POSTGRESQL
                const syncUserQuotaToDbUseCase = new SyncUserQuotaToDbUseCase();
                await syncUserQuotaToDbUseCase.execute(redis);

                // TUGAS 2: RESET KERAS (USE IT OR LOSE IT) - OPTIMIZED
                const downgradeExpiredUsersUseCase = new DowngradeExpiredUsersUseCase();
                await downgradeExpiredUsersUseCase.execute(today, redis);

                const downgradeExpiredUserQuotaUseCase = new DowngradeExpiredUserQuotaUseCase();
                await downgradeExpiredUserQuotaUseCase.execute(redis, today);

                const syncLeaderboardToDbUseCase = new SyncLeaderboardToDbUseCase();
                await syncLeaderboardToDbUseCase.execute(redis);

                log.success('Cron', 'Tugas malam selesai. PostgreSQL/MySQL dan Redis berhasil disinkronkan!');
            } catch (error) {
                console.error('[Cron] Terjadi kesalahan saat menjalankan tugas malam:', error);
            }
        });

        log.info('Cron Worker', 'Penjadwalan aktif. Menunggu eksekusi pada jam 23:59...');
    }


}