import { Op } from "sequelize";
import { scanRepository } from "../../../repositories/scan.repository";

export class LeaderboardCacheService {
    static async rebuildLeaderboardCache(redis: any, period: string) {
        console.log(`[Leaderboard] Rebuilding cache for period: ${period}`);
        const [yearStr, monthStr] = period.split("-");
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);

        let nextYear = year;
        let nextMonth = month + 1;
        if (nextMonth > 12) {
            nextMonth = 1;
            nextYear += 1;
        }

        const startDate = new Date(Date.UTC(year, month - 1, 1) - 7 * 60 * 60 * 1000);
        const endDate = new Date(Date.UTC(nextYear, nextMonth - 1, 1) - 7 * 60 * 60 * 1000);

        const scans = await scanRepository.findAll({
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
            if (scan.prediction && scan.prediction.toLowerCase() !== "normal") {
                stats.defect_scans += 1;
            }
        }

        const pipeline = redis.multi();
        const totalLeaderboardKey = `leaderboard:${period}:total_scans`;
        const defectLeaderboardKey = `leaderboard:${period}:defect_scans`;

        pipeline.del(totalLeaderboardKey);
        pipeline.del(defectLeaderboardKey);

        for (const [userIdStr, stats] of Object.entries(userStatsMap)) {
            const userId = parseInt(userIdStr);
            if (stats.total_scans > 0) {
                pipeline.zAdd(totalLeaderboardKey, [{ score: stats.total_scans, value: userId.toString() }]);
            }
            if (stats.defect_scans > 0) {
                pipeline.zAdd(defectLeaderboardKey, [{ score: stats.defect_scans, value: userId.toString() }]);
            }
        }

        pipeline.expire(totalLeaderboardKey, 86400 * 60);
        pipeline.expire(defectLeaderboardKey, 86400 * 60);

        await pipeline.exec();
        console.log(`[Leaderboard] Successfully rebuilt cache for ${Object.keys(userStatsMap).length} users in ${period}`);
    }
}

// Backward compatibility alias
export const LeaderboardHelper = LeaderboardCacheService;
