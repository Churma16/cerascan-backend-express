import {getSocket} from "../../../config/websocket_client";
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
            const io = getSocket();
            io.to(userId.toString()).emit('payment_success', data);

            io.emit(`payment_success_${data.orderId}`, data);

            console.log(`[Socket] Event payment_success dipancarkan untuk order: ${data.orderId}`);
        } catch (error) {
            console.error('[Socket] Gagal memancarkan event payment_success:', error);
        }
    }
}
