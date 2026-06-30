import { IPaymentRepository } from "../domain/IPaymentRepository";
import { SequelizePaymentRepository } from "../infrastructure/SequelizePaymentRepository";

export interface UpdatePaymentStatusInput {
    status: 'pending' | 'settlement' | 'expire' | 'deny';
    transaction_id?: string;
}

export class UpdatePaymentStatusUseCase {
    private paymentRepository: IPaymentRepository;

    constructor(paymentRepository: IPaymentRepository = new SequelizePaymentRepository()) {
        this.paymentRepository = paymentRepository;
    }

    async execute(id: number, payload: UpdatePaymentStatusInput) {
        const payment = await this.paymentRepository.findByPk(id);
        if (!payment) {
            throw new Error(`Payment dengan ID ${id} tidak ditemukan`);
        }
        await this.paymentRepository.update(id, {
            status: payload.status,
            ...(payload.transaction_id && { transaction_id: payload.transaction_id })
        });
        
        const updatedPayment = await this.paymentRepository.findByPk(id);
        return updatedPayment ? updatedPayment.toJSON() : payment.toJSON();
    }
}
