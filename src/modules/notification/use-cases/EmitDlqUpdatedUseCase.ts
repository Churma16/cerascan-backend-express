import { getSocket } from "../../../config/websocket_client";

export interface DlqUpdatedData {
    messageId: string;
    routingKey: string;
}

export class EmitDlqUpdatedUseCase {
    async execute(data: DlqUpdatedData) {
        try {
            const io = getSocket();
            io.emit('dlq_updated', data);
        } catch (error) {
            console.error('Gagal mengirim event dlq_updated', error);
        }
    }
}
