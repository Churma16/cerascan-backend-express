import { scanService } from "../../../services/scan.service";
import { getRedisClient } from "../../../config/redisClient";

/**
 * Antarmuka payload data analitik scan.
 */
export interface ScanAnalyticsPayload {
    scan_id: string;
    user_id: number;
    prediction: string;
    confidence_score: number;
    inference_time: number | string;
}

/**
 * Menangani pemrosesan pesan analitik scan.
 * Mencatat riwayat scan ke MongoDB, memperbarui akumulasi KPI harian pengguna,
 * dan membersihkan cache Redis terkait dashboard.
 */
export const handleScanAnalyticsMessage = async (payload: ScanAnalyticsPayload): Promise<void> => {
    const inferenceTimeNum = typeof payload.inference_time === 'number' 
        ? payload.inference_time 
        : parseInt(String(payload.inference_time)) || 0;

    await scanService.recordScanAnalytics({
        scan_id: payload.scan_id,
        user_id: payload.user_id,
        prediction: payload.prediction,
        confidence_score: payload.confidence_score,
        inference_time: inferenceTimeNum
    });

    const userId = payload.user_id || 0;

    try {
        const redisClient = getRedisClient();
        if (userId !== 0) {
            await redisClient.del(`dashboard:kpi:${userId}`);
            await redisClient.del(`dashboard:trend:${userId}`);
        } else {
            await redisClient.del('dashboard:kpi');
            await redisClient.del('dashboard:trend');
        }
    } catch (redisError: any) {
        console.error('[Analytics Handler] Gagal menghapus cache Redis:', redisError.message);
    }
};

export type AnalyticsPayload = ScanAnalyticsPayload;
export const handleAnalyticsMessage = handleScanAnalyticsMessage;
