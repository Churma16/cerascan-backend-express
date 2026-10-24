import { scanService } from "../../services/scan.service";
import { RecordCompletedScanUseCase } from "../../modules/leaderboard/use-cases/RecordCompletedScanUseCase";

/**
 * Antarmuka payload data untuk pembaruan database SQL dan leaderboard.
 *
 * @interface SqlPayload
 * @property {number|string} [db_id] - ID entitas rekaman scan di database SQL
 * @property {string} [prediction] - Hasil prediksi kecacatan dari model AI
 * @property {number} [confidence_score] - Skor kepercayaan/akurasi dari model AI
 * @property {string|number} [inference_time] - Durasi inferensi AI
 * @property {number} [user_id] - ID pengguna pemilik scan
 */
export interface SqlPayload {
    db_id?: number | string;
    prediction?: string;
    confidence_score?: number;
    inference_time?: string | number;
    user_id?: number;
}

/**
 * Menangani pemrosesan pesan untuk penyimpanan ke database SQL dan pembaruan leaderboard.
 *
 * @async
 * @function handleSqlMessage
 * @param {SqlPayload} payload - Data payload hasil scan yang akan disimpan.
 * @returns {Promise<void>}
 */
export const handleSqlMessage = async (payload: SqlPayload): Promise<void> => {
    if (payload.db_id) {
        const dbIdNum = typeof payload.db_id === 'number' 
            ? payload.db_id 
            : parseInt(String(payload.db_id));

        if (!isNaN(dbIdNum)) {
            await scanService.markScanAsSuccess(
                dbIdNum,
                payload.prediction || '',
                payload.confidence_score || 0,
                String(payload.inference_time || '')
            );
        }
    }

    if (payload.user_id && payload.prediction) {
        const recordCompletedScanUseCase = new RecordCompletedScanUseCase();
        await recordCompletedScanUseCase.execute(payload.user_id, payload.prediction);
    }
};
