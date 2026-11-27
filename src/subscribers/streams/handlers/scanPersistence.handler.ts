import { scanService } from "../../../services/scan.service";
import { leaderboardService } from "../../../services/leaderboard.service";

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
const persistScanSuccess = async (payload: ScanPersistencePayload): Promise<void> => {
    if (!payload.db_id) {
        return;
    }

    const dbIdNum = typeof payload.db_id === 'number' 
        ? payload.db_id 
        : parseInt(String(payload.db_id), 10);

    if (isNaN(dbIdNum)) {
        return;
    }

    await scanService.markScanAsSuccess(
        dbIdNum,
        payload.prediction || '',
        payload.confidence_score || 0,
        String(payload.inference_time || '')
    );
};

export const handleScanPersistenceMessage = async (payload: ScanPersistencePayload): Promise<void> => {
    await persistScanSuccess(payload);

    if (payload.user_id && payload.prediction) {
        await leaderboardService.recordCompletedScan(payload.user_id, payload.prediction);
    }
};

export type SqlPayload = ScanPersistencePayload;
export const handleSqlMessage = handleScanPersistenceMessage;
