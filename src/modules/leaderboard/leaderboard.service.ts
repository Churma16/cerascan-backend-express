import {getRedisClient} from "../../config/redis_client";
import {getCurrentMonthIdIndonesia} from "../../utils/time.helper";
import {User} from "../../models";

export class LeaderboardService {
    /**
     * Menambahkan poin ke pengguna setiap kali berhasil melakukan scan
     */
    static async incrementUserScore(userId: number | undefined, totalImages: number = 1) {
        if (!userId) {
            console.warn('[Leaderboard] Skipped incrementUserScore: userId is undefined');
            return;
        }

        const redis = getRedisClient();
        // Buat kunci yang unik untuk setiap bulan, contoh: "leaderboard:scans:2026-05"
        const currentMonth = getCurrentMonthIdIndonesia();
        const key = `leaderboard:scans:${currentMonth}`;

        // ZINCRBY: Tambahkan poin ke user. Jika user belum ada, Redis otomatis membuatnya.
        await redis.zIncrBy(key, totalImages, String(userId));
    }

    static async recordCompletedScan(userId: number, prediction: string) {
        try {
            const redis = getRedisClient();
            const currentMonth = getCurrentMonthIdIndonesia();

            const rankKey = `leaderboard:rank:${currentMonth}`;
            const statsKey = `leaderboard:stats:${currentMonth}:user:${userId}`;

            // 1. Tambah +1 ke Total Scan di ZSET (Untuk urutan ranking)
            await redis.zIncrBy(rankKey, 1, String(userId));

            // 2. Simpan detail ke HASH
            await redis.hIncrBy(statsKey, 'total_scans', 1);

            // 3. Jika AI bilang ini cacat (bukan 'normal'), tambah metrik defect
            if (prediction.toLowerCase() !== 'normal') {
                await redis.hIncrBy(statsKey, 'defect_scans', 1);
            }
        } catch (error: any) {
            console.error(`[Leaderboard] Error recording completed scan: ${error.message}`);
            throw error;
        }
    }

    static async getTopUsers(limit: number = 10) {
        const redis = getRedisClient();
        const currentMonth = getCurrentMonthIdIndonesia();
        const rankKey = `leaderboard:rank:${currentMonth}`;

        try {
            // Check if key exists before querying
            const keyExists = await redis.exists(rankKey);
            if (!keyExists) {
                console.log(`[Leaderboard] No data found for key: ${rankKey}`);
                return []; // No leaderboard data yet
            }

            // Get top users from sorted set (highest scores first) using REV option
            const topUserIds = await redis.sendCommand(['ZREVRANGE', rankKey, '0', String(limit - 1)]);
            const results = [];

            for (let i = 0; i < topUserIds.length; i++) {
                const userId = parseInt(topUserIds[i]);
                if (isNaN(userId)) continue;

                const statsKey = `leaderboard:stats:${currentMonth}:user:${userId}`;

                // Ambil detail total dan defect dari HASH
                const stats = await redis.hGetAll(statsKey);
                const user = await User.findByPk(userId, {
                    attributes: ['id', 'full_name', 'email']
                });

                if (user) {
                    results.push({
                        rank: i + 1,
                        user_id: user.id,
                        name: user.full_name,
                        email: user.email,
                        total_scans: parseInt(stats.total_scans || '0'),
                        defect_scans: parseInt(stats.defect_scans || '0'),
                        ratio: parseInt(stats.total_scans || '0') > 0 ? (parseInt(stats.defect_scans || '0') / parseInt(
                            stats.total_scans || '0')) : 0
                    });
                }
            }
            console.log(`[Leaderboard] Retrieved ${results.length} top users`);
            return results;
        } catch (error: any) {
            console.error(`[Leaderboard] Error fetching top users: ${error.message}`);
            console.error(error);
            throw error;
        }
    }

}