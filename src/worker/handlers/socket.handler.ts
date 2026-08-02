import { NotificationService } from "../../services/notification.service";

/**
 * Antarmuka payload data untuk pemancaran event WebSocket.
 *
 * @interface SocketPayload
 * @property {number|string} [db_id] - ID entitas rekaman scan di database SQL
 * @property {string} [scan_id] - ID unik transaksi scan
 * @property {string} [prediction] - Hasil prediksi kecacatan
 * @property {number} [confidence_score] - Skor akurasi model AI
 * @property {string|number} [inference_time] - Durasi inferensi AI
 */
export interface SocketPayload {
    db_id?: number | string;
    scan_id?: string;
    prediction?: string;
    confidence_score?: number;
    inference_time?: string | number;
}

/**
 * Menangani pemrosesan pesan untuk mengirimkan notifikasi real-time via WebSocket.
 *
 * @async
 * @function handleSocketMessage
 * @param {SocketPayload} payload - Data payload hasil scan yang akan dipancarkan ke client.
 * @returns {Promise<void>}
 */
export const handleSocketMessage = async (payload: SocketPayload): Promise<void> => {
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
