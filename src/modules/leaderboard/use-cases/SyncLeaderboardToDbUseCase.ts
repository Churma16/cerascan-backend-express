import { getCurrentMonthIdIndonesia } from "../../../utils/time.helper";
import { LeaderboardArchive } from "../../../models";
import { LeaderboardHelper } from "../infrastructure/leaderboard.helper";

export class SyncLeaderboardToDbUseCase {
    async execute(redis: any) {
        const currentPeriod = getCurrentMonthIdIndonesia();
        const redisRankKey = `leaderboard:rank:${currentPeriod}`;

        let keyExists = await redis.exists(redisRankKey);
        if (!keyExists) {
            console.log(`[Cron] Redis key ${redisRankKey} not found, rebuilding from DB before sync...`);
            await LeaderboardHelper.rebuildLeaderboardCache(redis, currentPeriod);
        }

        const activeUserIds = await redis.sendCommand(['ZREVRANGE', redisRankKey, '0', '-1']) as string[];

        const noActiveScannerThisMonth = !activeUserIds || activeUserIds.length === 0;
        if (noActiveScannerThisMonth) {
            console.log('✅ [Cron] Tugas 3 dilewati. Tidak ada data leaderboard bulan ini.');
            return;
        }

        const statsPipeline = redis.multi();

        for (const userIdString of activeUserIds) {
            const userStatsKey = `leaderboard:stats:${currentPeriod}:user:${userIdString}`;
            statsPipeline.hGetAll(userStatsKey);
        }

        const rawStatsResults = await statsPipeline.exec();

        const recordsToUpsert: any[] = [];

        activeUserIds.forEach((userIdString, index) => {
            const userId = parseInt(userIdString);
            const userMetrics = rawStatsResults[index] as Record<string, string>;

            if (userMetrics) {
                recordsToUpsert.push({
                    user_id: userId,
                    period: currentPeriod,
                    total_scans: parseInt(userMetrics.total_scans || '0'),
                    defect_scans: parseInt(userMetrics.defect_scans || '0')
                });
            }
        });

        if (recordsToUpsert.length > 0) {
            await LeaderboardArchive.bulkCreate(recordsToUpsert, {
                updateOnDuplicate: ['total_scans', 'defect_scans', 'updatedAt'] as any[]
            });
        }

        console.log(`✅ [Cron] Tugas 3 Selesai. ${recordsToUpsert.length} rekor leaderboard diamankan ke MySQL.`);
    }
}
