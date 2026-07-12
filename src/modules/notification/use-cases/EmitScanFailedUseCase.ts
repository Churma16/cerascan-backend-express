import { sseClient } from "../../../config/sseClient";

export interface ScanFailedData {
    scan_id: string;
    db_id: number;
    error: string;
}

export class EmitScanFailedUseCase {
    async execute(data: ScanFailedData) {
        sseClient.broadcast('scan_failed', data);
    }
}
