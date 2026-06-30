import { Payment, Plan } from "../../../models";

export class GetPaymentByUserIdUseCase {
    async execute(userId: number | undefined) {
        const payments = await Payment.findAll({
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
