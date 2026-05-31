import {Payment, Plan} from "../../models";
import {UserService} from "../user/user.service";
import sequelize from "../../config/database";
import {SubscriptionService} from "../subscription/subscription.service";
import {Transaction} from "sequelize";
import {UserQuotaService} from "../user_quota/user_quota.service";

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
    static async createPayment(payload: PaymentPayload, t?: Transaction) {
        const newPayment = await Payment.create({
            user_id: payload.user_id,
            plan_id: payload.plan_id,
            order_id: payload.order_id,
            transaction_id: payload.transaction_id,
            amount: payload.amount,
            payment_type: payload.payment_type,
            status: payload.status,
        } as any, {transaction: t});
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

    static async getPaymentByUserId(user_id: number | undefined) {
        const payments = await Payment.findAll({
            where: {user_id},
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

    static async processDBPaymentsWebhook(eventData: any) {
        const segments = eventData.orderId.split("-");
        const userId = Number(segments[1]);
        const planId = Number(segments[2]);

        const t = await sequelize.transaction();

        try {
            await UserService.upgradeTier(userId, planId, t);

            const paymentPayload: PaymentPayload = {
                user_id: userId,
                plan_id: planId,
                order_id: eventData.orderId,
                transaction_id: eventData.transactionId,
                amount: eventData.amount,
                payment_type: eventData.payment_type,
                status: eventData.status,
            };
            await PaymentService.createPayment(paymentPayload, t);

            await SubscriptionService.createSubscription(userId, planId, 'active', t);

            await UserQuotaService.createUserQuotaFromPayment(userId, planId, t)

            await t.commit();
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

}



