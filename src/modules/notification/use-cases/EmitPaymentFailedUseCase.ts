import { sseClient } from "../../../config/sseClient";
import { parseOrderId } from "../../payment/domain/payment.domain";

export interface PaymentFailedData {
    orderId: string;
    transactionId?: string;
    amount?: string;
    payment_type?: string;
    status: string;
    timestamp: string;
    error_message?: string;
}

export class EmitPaymentFailedUseCase {
    async execute(data: PaymentFailedData) {
        try {
            const { userId } = parseOrderId(data.orderId);
            
            sseClient.emitToUser(userId.toString(), 'payment_failed', data);
            sseClient.broadcast(`payment_failed_${data.orderId}`, data);
            
            console.log(`[SSE] Event payment_failed dipancarkan untuk order: ${data.orderId}`);
        } catch (error) {
            console.error('[SSE] Gagal memancarkan event payment_failed:', error);
        }
    }
}
