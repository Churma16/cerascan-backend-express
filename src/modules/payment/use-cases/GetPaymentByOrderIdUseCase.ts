import { IPaymentRepository } from "../domain/IPaymentRepository";
import { SequelizePaymentRepository } from "../infrastructure/SequelizePaymentRepository";

export class GetPaymentByOrderIdUseCase {
    private paymentRepository: IPaymentRepository;

    constructor(paymentRepository: IPaymentRepository = new SequelizePaymentRepository()) {
        this.paymentRepository = paymentRepository;
    }

    async execute(orderId: string) {
        const payment = await this.paymentRepository.findOne({ where: { order_id: orderId } });
        if (!payment) {
            throw new Error(`Payment dengan Order ID ${orderId} tidak ditemukan`);
        }
        return payment.toJSON();
    }
}
