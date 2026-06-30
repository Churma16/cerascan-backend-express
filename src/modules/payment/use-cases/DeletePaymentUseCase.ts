import { Payment } from "../../../models";

export class DeletePaymentUseCase {
    async execute(id: number) {
        const payment = await Payment.findByPk(id);
        if (!payment) {
            throw new Error(`Payment dengan ID ${id} tidak ditemukan`);
        }
        await payment.destroy();
        return { message: `Payment dengan ID ${id} berhasil dihapus` };
    }
}
