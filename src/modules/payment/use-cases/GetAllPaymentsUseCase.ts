import { Plan, User } from "../../../models";
import { IPaymentRepository } from "../domain/IPaymentRepository";
import { SequelizePaymentRepository } from "../infrastructure/SequelizePaymentRepository";

export class GetAllPaymentsUseCase {
    private paymentRepository: IPaymentRepository;

    constructor(paymentRepository: IPaymentRepository = new SequelizePaymentRepository()) {
        this.paymentRepository = paymentRepository;
    }

    async execute() {
        const payments = await this.paymentRepository.findAll({
            include: [
                { model: Plan, as: 'plan' },
                { model: User, as: 'user' }
            ]
        });
        return payments.map(payment => payment.toJSON());
    }
}
