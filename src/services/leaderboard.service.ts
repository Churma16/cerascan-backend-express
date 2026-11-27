import { Op } from "sequelize";
import { getRedisClient } from "../config/redisClient";
import { getCurrentMonthIdIndonesia } from "../utils/time.util";
import { scanRepository, ScanRepository } from "../repositories/scan.repository";
import { userRepository, UserRepository } from "../repositories/user.repository";
import { leaderboardRepository, LeaderboardRepository } from "../repositories/leaderboard.repository";

export class LeaderboardService {
    private scanRepo: ScanRepository;
    private userRepo: UserRepository;
    private archiveRepo: LeaderboardRepository;

    constructor(
        customScanRepo: ScanRepository = scanRepository,
        customUserRepo: UserRepository = userRepository,
        customArchiveRepo: LeaderboardRepository = leaderboardRepository
    ) {
        this.scanRepo = customScanRepo;
        this.userRepo = customUserRepo;
        this.archiveRepo = customArchiveRepo;
    }

    calculateDefectRatio(totalScans: number, defectScans: number): number {
        return totalScans > 0 ? defectScans / totalScans : 0;
    }

    async rebuildLeaderboardCache(redis: any, period: string): Promise<void> {
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

        const scans = await this.scanRepo.findAll({
            where: {
                createdAt: {
                    [Op.gte]: startDate,
                    [Op.lt]: endDate,
                },
                user_id: {
                    [Op.ne]: null as any,
                },
            },
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
        const redisRankKey = `leaderboard:rank:${period}`;

        pipeline.del(redisRankKey);

        for (const [userIdStr, stats] of Object.entries(userStatsMap)) {
            const userId = parseInt(userIdStr);
            const userStatsKey = `leaderboard:stats:${period}:user:${userId}`;

            if (stats.total_scans > 0) {
                pipeline.zAdd(redisRankKey, [{ score: stats.total_scans, value: userId.toString() }]);
            }
            pipeline.hSet(userStatsKey, "total_scans", stats.total_scans.toString());
            pipeline.hSet(userStatsKey, "defect_scans", stats.defect_scans.toString());
            pipeline.expire(userStatsKey, 86400 * 60);
        }

        pipeline.expire(redisRankKey, 86400 * 60);

        await pipeline.exec();
        console.log(`[Leaderboard] Successfully rebuilt cache for ${Object.keys(userStatsMap).length} users in ${period}`);
    }

    async getMonthlyLeaderboard(limit: number = 10): Promise<any[]> {
        const redis = getRedisClient();
        const currentPeriod = getCurrentMonthIdIndonesia();
        const redisRankKey = `leaderboard:rank:${currentPeriod}`;

        try {
            let keyExists = await redis.exists(redisRankKey);
            if (!keyExists) {
                console.log(`[Leaderboard] No data found for key: ${redisRankKey}, rebuilding cache...`);
                await this.rebuildLeaderboardCache(redis, currentPeriod);
                keyExists = await redis.exists(redisRankKey);
            }

            if (!keyExists) return [];

            const rawRankedUserIds = (await redis.sendCommand(["ZREVRANGE", redisRankKey, "0", String(limit - 1)])) as string[];

            if (!rawRankedUserIds || rawRankedUserIds.length === 0) return [];

            const parsedUserIds = rawRankedUserIds.map((id) => parseInt(id)).filter((id) => !isNaN(id));

            const metricsPipeline = redis.multi();
            parsedUserIds.forEach((userId) => {
                const userStatsKey = `leaderboard:stats:${currentPeriod}:user:${userId}`;
                metricsPipeline.hGetAll(userStatsKey);
            });
            const rawUserMetrics = await metricsPipeline.exec();

            const userProfiles = await this.userRepo.findByIds(parsedUserIds);

            const userProfileMap = new Map();
            userProfiles.forEach((user: any) => userProfileMap.set(user.id, user));

            const leaderboardEntries: any[] = [];
            parsedUserIds.forEach((userId, index) => {
                const userProfile = userProfileMap.get(userId);
                const metrics = rawUserMetrics[index] as Record<string, string>;

                if (userProfile && metrics) {
                    const totalScans = parseInt(metrics.total_scans || "0");
                    const defectScans = parseInt(metrics.defect_scans || "0");

                    leaderboardEntries.push({
                        rank: index + 1,
                        user_id: userProfile.id,
                        name: userProfile.full_name,
                        email: userProfile.email,
                        total_scans: totalScans,
                        defect_scans: defectScans,
                        ratio: this.calculateDefectRatio(totalScans, defectScans),
                    });
                }
            });

            console.log(`[Leaderboard] Retrieved ${leaderboardEntries.length} top users`);
            return leaderboardEntries;
        } catch (error: any) {
            console.error(`[Leaderboard] Error fetching top users: ${error.message}`);
            throw error;
        }
    }

    async syncLeaderboardToDb(customRedis?: any): Promise<void> {
        const redis = customRedis || getRedisClient();
        const currentPeriod = getCurrentMonthIdIndonesia();
        const redisRankKey = `leaderboard:rank:${currentPeriod}`;

        let keyExists = await redis.exists(redisRankKey);
        if (!keyExists) {
            console.log(`[Cron] Redis key ${redisRankKey} not found, rebuilding from DB before sync...`);
            await this.rebuildLeaderboardCache(redis, currentPeriod);
        }

        const activeUserIds = (await redis.sendCommand(["ZREVRANGE", redisRankKey, "0", "-1"])) as string[];

        const noActiveScannerThisMonth = !activeUserIds || activeUserIds.length === 0;
        if (noActiveScannerThisMonth) {
            console.log("✅ [Cron] Tugas 3 dilewati. Tidak ada data leaderboard bulan ini.");
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
                    total_scans: parseInt(userMetrics.total_scans || "0"),
                    defect_scans: parseInt(userMetrics.defect_scans || "0"),
                });
            }
        });

        if (recordsToUpsert.length > 0) {
            await this.archiveRepo.bulkUpsert(recordsToUpsert);
        }

        console.log(`✅ [Cron] Tugas 3 Selesai. ${recordsToUpsert.length} rekor leaderboard diamankan ke MySQL.`);
    }

    async recordCompletedScan(userId: number, prediction: string): Promise<void> {
        try {
            const redis = getRedisClient();
            const currentPeriod = getCurrentMonthIdIndonesia();

            const redisRankKey = `leaderboard:rank:${currentPeriod}`;
            const userStatsKey = `leaderboard:stats:${currentPeriod}:user:${userId}`;

            const writePipeline = redis.multi();

            writePipeline.zIncrBy(redisRankKey, 1, String(userId));
            writePipeline.hIncrBy(userStatsKey, "total_scans", 1);

            if (prediction.toLowerCase() !== "normal") {
                writePipeline.hIncrBy(userStatsKey, "defect_scans", 1);
            }

            await writePipeline.exec();
        } catch (error: any) {
            console.error(`[Leaderboard] Error recording completed scan: ${error.message}`);
            throw error;
        }
    }
}

export const leaderboardService = new LeaderboardService();
