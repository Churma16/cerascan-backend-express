import { getSocket } from "../../config/websocket_client";

export class NotificationService {
    static emitScanCompleted(data: { db_id: number, scan_id: string, prediction: string, confidence: number, inference_time: string }) {
        const io = getSocket();
        io.emit('scan_completed', data);
    }

    static emitScanFailed(data: { scan_id: string, db_id: number, error: string }) {
        const io = getSocket();
        io.emit('scan_failed', data);
    }
}
