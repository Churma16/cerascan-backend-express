import { Payment } from "../../../models";
import { Transaction } from "sequelize";

export interface CreatePaymentInput {
    user_id: number;
    plan_id: number;
    order_id: string;
    transaction_id?: string;
    amount: number;
    payment_type?: string;
    status: 'pending' | 'settlement' | 'expire' | 'deny';
}

export class CreatePaymentUseCase {
    async execute(payload: CreatePaymentInput, t?: Transaction) {
        const newPayment = await Payment.create({
            user_id: payload.user_id,
            plan_id: payload.plan_id,
            order_id: payload.order_id,
            transaction_id: payload.transaction_id,
            amount: payload.amount,
            payment_type: payload.payment_type,
            status: payload.status,
        } as any, { transaction: t });
        return newPayment.toJSON();
    }
}
