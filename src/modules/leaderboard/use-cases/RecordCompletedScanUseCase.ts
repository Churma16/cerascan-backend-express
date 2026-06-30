import { getRedisClient } from "../../../config/redis_client";
import { getCurrentMonthIdIndonesia } from "../../../utils/time.helper";

export class RecordCompletedScanUseCase {
    async execute(userId: number, prediction: string) {
        try {
            const redis = getRedisClient();
            const currentPeriod = getCurrentMonthIdIndonesia();

            const redisRankKey = `leaderboard:rank:${currentPeriod}`;
            const userStatsKey = `leaderboard:stats:${currentPeriod}:user:${userId}`;

            const writePipeline = redis.multi();

            // Increment total scan
            writePipeline.zIncrBy(redisRankKey, 1, String(userId));

            // Simpan ke hash
            writePipeline.hIncrBy(userStatsKey, 'total_scans', 1);

            // Jika prediksi bukan normal, tambahkan ke defect
            if (prediction.toLowerCase() !== 'normal') {
                writePipeline.hIncrBy(userStatsKey, 'defect_scans', 1);
            }

            // Eksekusi Pipeline
            await writePipeline.exec();
        } catch (error: any) {
            console.error(`[Leaderboard] Error recording completed scan: ${error.message}`);
            throw error;
        }
    }
}
