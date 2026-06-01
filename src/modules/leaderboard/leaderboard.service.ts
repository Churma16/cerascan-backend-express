import {getRedisClient} from "../../config/redis_client";
import {getCurrentMonthIdIndonesia} from "../../utils/time.helper";
import {LeaderboardArchive, User} from "../../models";
import {Op} from "sequelize";

export class LeaderboardService {

    static async recordCompletedScan(userId: number, prediction: string) {
        try {
            const redis = getRedisClient();
            const currentPeriod = getCurrentMonthIdIndonesia();

            const redisRankKey = `leaderboard:rank:${currentPeriod}`;
            const userStatsKey = `leaderboard:stats:${currentPeriod}:user:${userId}`;

            const writePipeline = redis.multi();

            // Increment total scan
            writePipeline.zIncrBy(redisRankKey, 1, String(userId));

            // Save to hash
            writePipeline.hIncrBy(userStatsKey, 'total_scans', 1);

            // If prediction is not normal, add to defect
            if (prediction.toLowerCase() !== 'normal') {
                writePipeline.hIncrBy(userStatsKey, 'defect_scans', 1);
            }

            // Execute Pipeline
            await writePipeline.exec();

        } catch (error: any) {
            console.error(`[Leaderboard] Error recording completed scan: ${error.message}`);
            throw error;
        }
    }

    static async getTopUsers(limit: number = 10) {
        const redis = getRedisClient();
        const currentPeriod = getCurrentMonthIdIndonesia();
        const redisRankKey = `leaderboard:rank:${currentPeriod}`;

        try {
            const keyExists = await redis.exists(redisRankKey);
            if (!keyExists) {
                console.log(`[Leaderboard] No data found for key: ${redisRankKey}`);
                return [];
            }

            // Get top users from Redis
            const rawRankedUserIds = await redis.sendCommand(['ZREVRANGE', redisRankKey, '0', String(limit - 1)]) as string[];

            if (rawRankedUserIds.length === 0) return [];

            // Parse string to Number
            const parsedUserIds = rawRankedUserIds.map(id => parseInt(id)).filter(id => !isNaN(id));

            // Get all metrics
            const metricsPipeline = redis.multi();
            parsedUserIds.forEach(userId => {
                const userStatsKey = `leaderboard:stats:${currentPeriod}:user:${userId}`;
                metricsPipeline.hGetAll(userStatsKey);
            });
            const rawUserMetrics = await metricsPipeline.exec();

            // Get all top user data from DB
            const userProfiles = await User.findAll({
                where: {
                    id: {[Op.in]: parsedUserIds}
                },
                attributes: ['id', 'full_name', 'email']
            });


            const userProfileMap = new Map();
            userProfiles.forEach(user => userProfileMap.set(user.id, user));

            // Process Data
            const leaderboardEntries: any = [];

            parsedUserIds.forEach((userId, index) => {
                const userProfile = userProfileMap.get(userId);
                const metrics = rawUserMetrics[index] as Record<string, string>;

                if (userProfile && metrics) {
                    const totalScans = parseInt(metrics.total_scans || '0');
                    const defectScans = parseInt(metrics.defect_scans || '0');

                    leaderboardEntries.push({
                        rank: index + 1,
                        user_id: userProfile.id,
                        name: userProfile.full_name,
                        email: userProfile.email,
                        total_scans: totalScans,
                        defect_scans: defectScans,
                        ratio: totalScans > 0 ? (defectScans / totalScans) : 0
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

    static async syncLeaderboardDataToDb(redis: any) {
        const currentPeriod = getCurrentMonthIdIndonesia();
        const redisRankKey = `leaderboard:rank:${currentPeriod}`;

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
                updateOnDuplicate: ['total_scans', 'defect_scans']
            });
        }

        console.log(`✅ [Cron] Tugas 3 Selesai. ${recordsToUpsert.length} rekor leaderboard diamankan ke MySQL.`);
    }
}