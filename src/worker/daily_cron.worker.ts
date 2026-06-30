import cron from 'node-cron';
import {getRedisClient} from '../config/redis_client';
import { SyncUserQuotaToDbUseCase } from "../modules/user_quota/use-cases/SyncUserQuotaToDbUseCase";
import { DowngradeExpiredUserQuotaUseCase } from "../modules/user_quota/use-cases/DowngradeExpiredUserQuotaUseCase";
import { SyncLeaderboardToDbUseCase } from "../modules/leaderboard/use-cases/SyncLeaderboardToDbUseCase";
import { DowngradeExpiredUsersUseCase } from "../modules/user/use-cases/DowngradeExpiredUsersUseCase";

export class CronWorker {
    static start() {
        cron.schedule('59 23 * * *', async () => {
            console.log('🌙 [Cron] Memulai sinkronisasi pembukuan kuota...');
            const redis = getRedisClient();

            try {
                // TUGAS 1: SINKRONISASI REDIS KE POSTGRESQL
                const syncUserQuotaToDbUseCase = new SyncUserQuotaToDbUseCase();
                await syncUserQuotaToDbUseCase.execute(redis);

                // TUGAS 2: RESET KERAS (USE IT OR LOSE IT) - OPTIMIZED
                const downgradeExpiredUsersUseCase = new DowngradeExpiredUsersUseCase();
                await downgradeExpiredUsersUseCase.execute();

                const downgradeExpiredUserQuotaUseCase = new DowngradeExpiredUserQuotaUseCase();
                await downgradeExpiredUserQuotaUseCase.execute(redis);

                const syncLeaderboardToDbUseCase = new SyncLeaderboardToDbUseCase();
                await syncLeaderboardToDbUseCase.execute(redis);

                console.log('[Cron] Tugas malam selesai. PostgreSQL/MySQL dan Redis berhasil disinkronkan!');
            } catch (error) {
                console.error('[Cron] Terjadi kesalahan saat menjalankan tugas malam:', error);
            }
        });

        console.log('[Cron Worker] Penjadwalan aktif. Menunggu eksekusi pada jam 23:59...');
    }


}