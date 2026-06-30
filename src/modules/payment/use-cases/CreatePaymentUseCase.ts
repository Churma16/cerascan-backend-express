import { Transaction } from "sequelize";
import { IPaymentRepository } from "../domain/IPaymentRepository";
import { SequelizePaymentRepository } from "../infrastructure/SequelizePaymentRepository";

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
    private paymentRepository: IPaymentRepository;

    constructor(paymentRepository: IPaymentRepository = new SequelizePaymentRepository()) {
        this.paymentRepository = paymentRepository;
    }

    async execute(payload: CreatePaymentInput, t?: Transaction) {
        const newPayment = await this.paymentRepository.create({
            user_id: payload.user_id,
            plan_id: payload.plan_id,
            order_id: payload.order_id,
            transaction_id: payload.transaction_id,
            amount: payload.amount,
            payment_type: payload.payment_type,
            status: payload.status,
        }, t);
        return newPayment.toJSON();
    }
}
