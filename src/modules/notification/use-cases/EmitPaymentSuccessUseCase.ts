import {sseClient} from "../../../config/sseClient";
import {parseOrderId} from "../../payment/domain/payment.domain";

export interface PaymentSuccessData {
    orderId: string;
    transactionId: string;
    amount: string;
    payment_type: string;
    status: string;
    timestamp: string;
}

export class EmitPaymentSuccessUseCase {
    async execute(data: PaymentSuccessData) {
        try {
            const {userId} = parseOrderId(data.orderId);
            
            // Mengirim notifikasi SSE ke spesifik user ID
            sseClient.emitToUser(userId.toString(), 'payment_success', data);

            // Mengirim notifikasi SSE secara spesifik by order ID
            sseClient.broadcast(`payment_success_${data.orderId}`, data);

            console.log(`[SSE] Event payment_success dipancarkan untuk order: ${data.orderId}`);
        } catch (error) {
            console.error('[SSE] Gagal memancarkan event payment_success:', error);
        }
    }
}
