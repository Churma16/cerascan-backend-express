import { sseClient } from "../../../config/sseClient";

export interface DlqUpdatedData {
    action: 'add' | 'remove' | 'retry';
    data: any;
}

export class EmitDlqUpdatedUseCase {
    async execute(data: DlqUpdatedData) {
        try {
            sseClient.broadcast('dlq_updated', data);
        } catch (error) {
            console.error('[SSE] Gagal memancarkan event dlq_updated:', error);
        }
    }
}
