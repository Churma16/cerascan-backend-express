import { scanService } from "../../../services/scan.service";
import { RecordCompletedScanUseCase } from "../../../modules/leaderboard/use-cases/RecordCompletedScanUseCase";

/**
 * Antarmuka payload data untuk pembaruan database SQL dan leaderboard.
 */
export interface ScanPersistencePayload {
    db_id?: number | string;
    prediction?: string;
    confidence_score?: number;
    inference_time?: string | number;
    user_id?: number;
}

/**
 * Menangani pemrosesan pesan untuk penyimpanan ke database SQL dan pembaruan leaderboard.
 */
export const handleScanPersistenceMessage = async (payload: ScanPersistencePayload): Promise<void> => {
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

export type SqlPayload = ScanPersistencePayload;
export const handleSqlMessage = handleScanPersistenceMessage;
