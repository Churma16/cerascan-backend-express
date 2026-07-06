import { getSocket } from "../../../config/websocketClient";

export interface ScanCompletedData {
    db_id: number;
    scan_id: string;
    prediction: string;
    confidence: number;
    inference_time: string;
}

export class EmitScanCompletedUseCase {
    async execute(data: ScanCompletedData) {
        const io = getSocket();
        io.emit('scan_completed', data);
    }
}
