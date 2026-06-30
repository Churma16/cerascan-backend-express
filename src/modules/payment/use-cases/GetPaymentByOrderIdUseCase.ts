import { Payment } from "../../../models";

export class GetPaymentByOrderIdUseCase {
    async execute(orderId: string) {
        const payment = await Payment.findOne({ where: { order_id: orderId } });
        if (!payment) {
            throw new Error(`Payment dengan Order ID ${orderId} tidak ditemukan`);
        }
        return payment.toJSON();
    }
}
