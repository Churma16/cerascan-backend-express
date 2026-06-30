import { getSocket } from "../../../config/websocket_client";

export interface ScanFailedData {
    scan_id: string;
    db_id: number;
    error: string;
}

export class EmitScanFailedUseCase {
    async execute(data: ScanFailedData) {
        const io = getSocket();
        io.emit('scan_failed', data);
    }
}
