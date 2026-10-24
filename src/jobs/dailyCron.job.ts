import cron from "node-cron";
import { getRedisClient } from "../config/redisClient";
import { quotaService } from "../services/quota.service";
import { SyncLeaderboardToDbUseCase } from "../modules/leaderboard/use-cases/SyncLeaderboardToDbUseCase";
import { DowngradeExpiredUsersUseCase } from "../modules/user/use-cases/DowngradeExpiredUsersUseCase";
import { log } from "../utils/logger.util";

/**
 * Job penjadwalan harian (Daily Cron Job) yang bertugas menyinkronkan data pemakaian kuota,
 * kedaluwarsa pengguna, kuota yang kedaluwarsa, dan peringkat leaderboard dari Redis ke database.
 */
export class DailyCronJob {
    /**
     * Memulai jadwal cron job yang mengeksekusi sinkronisasi otomatis setiap malam pukul 23:59.
     *
     * @static
     * @returns {void}
     */
    static start(): void {
        cron.schedule("59 23 * * *", async () => {
            log.info("Cron", "Memulai sinkronisasi pembukuan kuota...");
            const redis = getRedisClient();

            try {
                const today = new Date();

                await quotaService.syncQuotasToDatabase(redis);

                const downgradeExpiredUsersUseCase = new DowngradeExpiredUsersUseCase();
                await downgradeExpiredUsersUseCase.execute(today, redis);

                const syncLeaderboardToDbUseCase = new SyncLeaderboardToDbUseCase();
                await syncLeaderboardToDbUseCase.execute(redis);

                log.success("Cron", "Tugas malam selesai. Database dan Redis berhasil disinkronkan!");
            } catch (error) {
                console.error("[Cron] Terjadi kesalahan saat menjalankan tugas malam:", error);
            }
        });
    }
}
