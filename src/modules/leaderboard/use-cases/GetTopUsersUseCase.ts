import { getRedisClient } from "../../../config/redis_client";
import { getCurrentMonthIdIndonesia } from "../../../utils/time.helper";
import { LeaderboardHelper } from "../infrastructure/leaderboard.helper";
import { calculateDefectRatio } from "../domain/leaderboard.domain";
import { IUserRepository } from "../../user/domain/IUserRepository";
import { SequelizeUserRepository } from "../../user/infrastructure/SequelizeUserRepository";

export class GetTopUsersUseCase {
    private userRepository: IUserRepository;

    constructor(userRepository: IUserRepository = new SequelizeUserRepository()) {
        this.userRepository = userRepository;
    }

    async execute(limit: number = 10) {
        const redis = getRedisClient();
        const currentPeriod = getCurrentMonthIdIndonesia();
        const redisRankKey = `leaderboard:rank:${currentPeriod}`;

        try {
            let keyExists = await redis.exists(redisRankKey);
            if (!keyExists) {
                console.log(`[Leaderboard] No data found for key: ${redisRankKey}, rebuilding cache...`);
                await LeaderboardHelper.rebuildLeaderboardCache(redis, currentPeriod);
                keyExists = await redis.exists(redisRankKey);
            }

            if (!keyExists) return [];

            // Ambil top users dari Redis
            const rawRankedUserIds = await redis.sendCommand(['ZREVRANGE', redisRankKey, '0', String(limit - 1)]) as string[];

            if (rawRankedUserIds.length === 0) return [];

            // Parse string ke Number
            const parsedUserIds = rawRankedUserIds.map(id => parseInt(id)).filter(id => !isNaN(id));

            // Ambil semua metrik
            const metricsPipeline = redis.multi();
            parsedUserIds.forEach(userId => {
                const userStatsKey = `leaderboard:stats:${currentPeriod}:user:${userId}`;
                metricsPipeline.hGetAll(userStatsKey);
            });
            const rawUserMetrics = await metricsPipeline.exec();

            // Ambil semua data profil user dari DB
            const userProfiles = await this.userRepository.findByIds(parsedUserIds);

            const userProfileMap = new Map();
            userProfiles.forEach(user => userProfileMap.set(user.id, user));

            // Proses data
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
                        ratio: calculateDefectRatio(totalScans, defectScans)
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
}
