import { Payment } from "../../../models";

export interface UpdatePaymentStatusInput {
    status: 'pending' | 'settlement' | 'expire' | 'deny';
    transaction_id?: string;
}

export class UpdatePaymentStatusUseCase {
    async execute(id: number, payload: UpdatePaymentStatusInput) {
        const payment = await Payment.findByPk(id);
        if (!payment) {
            throw new Error(`Payment dengan ID ${id} tidak ditemukan`);
        }
        await payment.update({
            status: payload.status,
            ...(payload.transaction_id && { transaction_id: payload.transaction_id })
        } as any);
        return payment.toJSON();
    }
}
