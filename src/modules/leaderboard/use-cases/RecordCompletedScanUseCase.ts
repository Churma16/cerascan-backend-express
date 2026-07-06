import { getRedisClient } from "../../../config/redisClient";
import { getCurrentMonthIdIndonesia } from "../../../utils/time.helper";

export class RecordCompletedScanUseCase {
    async execute(userId: number, prediction: string) {
        try {
            const redis = getRedisClient();
            const currentPeriod = getCurrentMonthIdIndonesia();

            const redisRankKey = `leaderboard:rank:${currentPeriod}`;
            const userStatsKey = `leaderboard:stats:${currentPeriod}:user:${userId}`;

            const writePipeline = redis.multi();

            writePipeline.zIncrBy(redisRankKey, 1, String(userId));

            writePipeline.hIncrBy(userStatsKey, 'total_scans', 1);

            if (prediction.toLowerCase() !== 'normal') {
                writePipeline.hIncrBy(userStatsKey, 'defect_scans', 1);
            }

            await writePipeline.exec();
        } catch (error: any) {
            console.error(`[Leaderboard] Error recording completed scan: ${error.message}`);
            throw error;
        }
    }
}
