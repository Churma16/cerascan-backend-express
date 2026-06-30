import { Payment, Plan, User } from "../../../models";

export class GetAllPaymentsUseCase {
    async execute() {
        const payments = await Payment.findAll({
            include: [
                { model: Plan, as: 'plan' },
                { model: User, as: 'user' }
            ]
        });
        return payments.map(payment => payment.toJSON());
    }
}
