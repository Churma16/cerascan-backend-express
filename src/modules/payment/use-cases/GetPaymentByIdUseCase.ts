import { Payment } from "../../../models";

export class GetPaymentByIdUseCase {
    async execute(id: number) {
        const payment = await Payment.findByPk(id);
        if (!payment) {
            throw new Error(`Payment dengan ID ${id} tidak ditemukan`);
        }
        return payment.toJSON();
    }
}
