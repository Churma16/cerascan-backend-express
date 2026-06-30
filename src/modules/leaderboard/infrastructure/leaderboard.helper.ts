import { Scan } from "../../../models";
import { Op } from "sequelize";

export class LeaderboardHelper {
    static async rebuildLeaderboardCache(redis: any, period: string) {
        console.log(`[Leaderboard] Rebuilding cache for period: ${period}`);
        const [yearStr, monthStr] = period.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);

        // Awal dan akhir bulan di zona waktu Indonesia (UTC+7)
        const startDate = new Date(Date.UTC(year, month - 1, 1) - 7 * 60 * 60 * 1000);
        
        let nextYear = year;
        let nextMonth = month + 1;
        if (nextMonth > 12) {
            nextMonth = 1;
            nextYear += 1;
        }
        const endDate = new Date(Date.UTC(nextYear, nextMonth - 1, 1) - 7 * 60 * 60 * 1000);

        const scans = await Scan.findAll({
            where: {
                createdAt: {
                    [Op.gte]: startDate,
                    [Op.lt]: endDate
                },
                user_id: {
                    [Op.ne]: null as any
                }
            }
        });

        if (scans.length === 0) {
            console.log(`[Leaderboard] No scan history found in DB for period: ${period}`);
            return;
        }

        const userStatsMap: Record<number, { total_scans: number; defect_scans: number }> = {};
        for (const scan of scans) {
            const userId = scan.user_id;
            if (!userStatsMap[userId]) {
                userStatsMap[userId] = { total_scans: 0, defect_scans: 0 };
            }
            const stats = userStatsMap[userId];
            stats.total_scans += 1;
            if (scan.prediction && scan.prediction.toLowerCase() !== 'normal') {
                stats.defect_scans += 1;
            }
        }

        const redisRankKey = `leaderboard:rank:${period}`;
        const pipeline = redis.multi();

        for (const userIdString of Object.keys(userStatsMap)) {
            const userId = parseInt(userIdString);
            const stats = userStatsMap[userId];
            const userStatsKey = `leaderboard:stats:${period}:user:${userId}`;
            pipeline.zAdd(redisRankKey, { score: stats.total_scans, value: String(userId) });
            pipeline.hSet(userStatsKey, 'total_scans', String(stats.total_scans));
            pipeline.hSet(userStatsKey, 'defect_scans', String(stats.defect_scans));
        }

        // Set TTL 35 hari pada key Redis agar dibersihkan otomatis
        pipeline.expire(redisRankKey, 35 * 24 * 60 * 60);
        for (const userIdString of Object.keys(userStatsMap)) {
            const userId = parseInt(userIdString);
            const userStatsKey = `leaderboard:stats:${period}:user:${userId}`;
            pipeline.expire(userStatsKey, 35 * 24 * 60 * 60);
        }

        await pipeline.exec();
        console.log(`[Leaderboard] Rebuilt cache for ${Object.keys(userStatsMap).length} users`);
    }
}
