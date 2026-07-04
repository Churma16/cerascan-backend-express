import { getSocket } from "../../../config/websocket_client";
import { parseOrderId } from "../../payment/domain/payment.domain";

export interface PaymentFailedData {
    orderId: string;
    transactionId: string;
    amount: string;
    payment_type: string;
    status: string;
    timestamp: string;
}

export class EmitPaymentFailedUseCase {
    async execute(data: PaymentFailedData) {
        try {
            const { userId } = parseOrderId(data.orderId);
            const io = getSocket();
            
            io.to(userId.toString()).emit('payment_failed', data);
            io.emit(`payment_failed_${data.orderId}`, data);
            
            console.log(`[Socket] Event payment_failed dipancarkan untuk order: ${data.orderId}`);
        } catch (error) {
            console.error('[Socket] Gagal memancarkan event payment_failed:', error);
        }
    }
}
