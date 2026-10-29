import { NotificationService } from "../../../services/notification.service";

/**
 * Antarmuka payload data untuk pemancaran event WebSocket dan SSE.
 */
export interface ScanBroadcastPayload {
    db_id?: number | string;
    scan_id?: string;
    prediction?: string;
    confidence_score?: number;
    inference_time?: string | number;
}

/**
 * Menangani pemrosesan pesan untuk mengirimkan notifikasi real-time via WebSocket dan SSE.
 */
export const handleScanBroadcastMessage = async (payload: ScanBroadcastPayload): Promise<void> => {
    if (payload.db_id) {
        const dbIdNum = typeof payload.db_id === 'number' 
            ? payload.db_id 
            : parseInt(String(payload.db_id));

        if (!isNaN(dbIdNum)) {
            const scanData = {
                db_id: dbIdNum,
                scan_id: payload.scan_id || '',
                prediction: payload.prediction || '',
                confidence: payload.confidence_score || 0,
                inference_time: String(payload.inference_time || '')
            };
            await NotificationService.emitScanCompleted(scanData);
        }
    }
};

export type SocketPayload = ScanBroadcastPayload;
export const handleSocketMessage = handleScanBroadcastMessage;
