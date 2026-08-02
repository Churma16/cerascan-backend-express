import { RecordScanHistoryUseCase } from "../../modules/scan/use-cases/RecordScanHistoryUseCase";
import dayjs from 'dayjs';
import { getRedisClient } from "../../config/redisClient";
import { MongoScanRepository } from "../../modules/scan/infrastructure/MongoScanRepository";

/**
 * Antarmuka payload data analitik scan.
 *
 * @interface AnalyticsPayload
 * @property {string} scan_id - ID unik transaksi scan
 * @property {number} user_id - ID pengguna yang melakukan scan
 * @property {string} prediction - Hasil prediksi kecacatan
 * @property {number} confidence_score - Tingkat kepercayaan/akurasi model AI
 * @property {number|string} inference_time - Durasi eksekusi inferensi AI
 */
export interface AnalyticsPayload {
    scan_id: string;
    user_id: number;
    prediction: string;
    confidence_score: number;
    inference_time: number | string;
}

/**
 * Menangani pemrosesan pesan analitik scan.
 * Fungsi ini mencatat riwayat scan ke MongoDB, memperbarui akumulasi KPI harian pengguna,
 * dan membersihkan cache Redis terkait dashboard.
 *
 * @async
 * @function handleAnalyticsMessage
 * @param {AnalyticsPayload} payload - Payload data analitik hasil scan AI.
 * @returns {Promise<void>}
 */
export const handleAnalyticsMessage = async (payload: AnalyticsPayload): Promise<void> => {
    const recordScanHistoryUseCase = new RecordScanHistoryUseCase();
    const inferenceTimeNum = typeof payload.inference_time === 'number' 
        ? payload.inference_time 
        : parseInt(String(payload.inference_time)) || 0;

    await recordScanHistoryUseCase.execute({
        scan_id: payload.scan_id,
        user_id: payload.user_id,
        prediction: payload.prediction,
        confidence_score: payload.confidence_score,
        inference_time: inferenceTimeNum
    });

    const userId = payload.user_id || 0;
    const todayDateStr = dayjs().format('YYYY-MM-DD');
    const isDefect = ['crack', 'scratch', 'stain'].includes((payload.prediction || '').toLowerCase());
    await MongoScanRepository.incrementScanKpi(userId, payload.confidence_score, isDefect);

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
