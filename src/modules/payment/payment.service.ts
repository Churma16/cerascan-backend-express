import {Payment} from "../../models";

export interface PaymentPayload {
    user_id: number;
    plan_id: number;
    order_id: string;
    transaction_id?: string;
    amount: number;
    payment_type?: string;
    status: 'pending' | 'settlement' | 'expire' | 'deny';
}

export class PaymentService {
    static async createPayment(payload: PaymentPayload) {
        const newPayment = await Payment.create({
            user_id: payload.user_id,
            plan_id: payload.plan_id,
            order_id: payload.order_id,
            transaction_id: payload.transaction_id,
            amount: payload.amount,
            payment_type: payload.payment_type,
            status: payload.status,
        } as any);
        return newPayment.toJSON();
    }

    static async getAllPayments() {
        const payments = await Payment.findAll();
        return payments.map(payment => payment.toJSON());
    }

    static async getPaymentById(id: number) {
        const payment = await Payment.findByPk(id);
        if (!payment) {
            throw new Error(`Payment dengan ID ${id} tidak ditemukan`);
        }
        return payment.toJSON();
    }

    static async getPaymentByOrderId(order_id: string) {
        const payment = await Payment.findOne({where: {order_id}});
        if (!payment) {
            throw new Error(`Payment dengan Order ID ${order_id} tidak ditemukan`);
        }
        return payment.toJSON();
    }

    static async getPaymentByUserId(user_id: number) {
        const payments = await Payment.findAll({where: {user_id}});
        return payments.map(payment => payment.toJSON());
    }

    static async updatePaymentStatus(id: number, payload: {
        status: 'pending' | 'settlement' | 'expire' | 'deny';
        transaction_id?: string
    }) {
        const payment = await Payment.findByPk(id);
        if (!payment) {
            throw new Error(`Payment dengan ID ${id} tidak ditemukan`);
        }
        await payment.update({
            status: payload.status,
            ...(payload.transaction_id && {transaction_id: payload.transaction_id})
        } as any);
        return payment.toJSON();
    }

    static async deletePayment(id: number) {
        const payment = await Payment.findByPk(id);
        if (!payment) {
            throw new Error(`Payment dengan ID ${id} tidak ditemukan`);
        }
        await payment.destroy();
        return {message: `Payment dengan ID ${id} berhasil dihapus`};
    }
}



