import { IPaymentRepository } from "../domain/IPaymentRepository";
import { SequelizePaymentRepository } from "../infrastructure/SequelizePaymentRepository";

export class GetPaymentByIdUseCase {
    private paymentRepository: IPaymentRepository;

    constructor(paymentRepository: IPaymentRepository = new SequelizePaymentRepository()) {
        this.paymentRepository = paymentRepository;
    }

    async execute(id: number) {
        const payment = await this.paymentRepository.findByPk(id);
        if (!payment) {
            throw new Error(`Payment dengan ID ${id} tidak ditemukan`);
        }
        return payment.toJSON();
    }
}
