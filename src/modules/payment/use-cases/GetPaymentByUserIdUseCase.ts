import { Plan } from "../../../models";
import { IPaymentRepository } from "../domain/IPaymentRepository";
import { SequelizePaymentRepository } from "../infrastructure/SequelizePaymentRepository";

export class GetPaymentByUserIdUseCase {
    private paymentRepository: IPaymentRepository;

    constructor(paymentRepository: IPaymentRepository = new SequelizePaymentRepository()) {
        this.paymentRepository = paymentRepository;
    }

    async execute(userId: number | undefined) {
        const payments = await this.paymentRepository.findAll({
            where: { user_id: userId },
            include: {
                model: Plan,
                as: "plan"
            },
            order: [
                ['createdAt', 'DESC']
            ]
        });
        return payments.map(payment => payment.toJSON());
    }
}
