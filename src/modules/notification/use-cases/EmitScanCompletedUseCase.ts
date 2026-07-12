import { getSocket } from "../../../config/websocketClient";
import { sseClient } from "../../../config/sseClient";

export interface ScanCompletedData {
    db_id: number;
    scan_id: string;
    prediction: string;
    confidence: number;
    inference_time: string;
}

export class EmitScanCompletedUseCase {
    async execute(data: ScanCompletedData) {
        // Emit via WebSocket (untuk fitur Leaderboard)
        const io = getSocket();
        io.emit('scan_completed', data);

        // Emit via SSE (untuk Scanner dan Batch Scan)
        sseClient.broadcast('scan_completed', data);
    }
}
