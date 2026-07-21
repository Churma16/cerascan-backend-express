import sequelize from "../../../config/databaseClient";
import { UpgradeTierUseCase } from "../../user/use-cases/UpgradeTierUseCase";
import { CreateSubscriptionUseCase } from "../../subscription/use-cases/CreateSubscriptionUseCase";
import { CreateUserQuotaFromPaymentUseCase } from '../../userQuota/use-cases/CreateUserQuotaFromPaymentUseCase';
import { CreatePaymentUseCase, CreatePaymentInput } from "./CreatePaymentUseCase";
import { parseOrderId } from "../domain/payment.domain";

export class ProcessPaymentWebhookUseCase {
    async execute(eventData: any) {
        const { userId, planId } = parseOrderId(eventData.orderId);

        const t = await sequelize.transaction();

        try {
            const upgradeTierUseCase = new UpgradeTierUseCase();
            await upgradeTierUseCase.execute(userId, planId, t);

            const paymentPayload: CreatePaymentInput = {
                user_id: userId,
                plan_id: planId,
                order_id: eventData.orderId,
                transaction_id: eventData.transactionId,
                amount: eventData.amount,
                payment_type: eventData.payment_type,
                status: eventData.status,
            };
            const createPaymentUseCase = new CreatePaymentUseCase();
            await createPaymentUseCase.execute(paymentPayload, t);

            const createSubscriptionUseCase = new CreateSubscriptionUseCase();
            await createSubscriptionUseCase.execute(userId, planId, 'active', 'midtrans_payment', '', t);

            const createUserQuotaFromPaymentUseCase = new CreateUserQuotaFromPaymentUseCase();
            await createUserQuotaFromPaymentUseCase.execute(userId, planId, t);

            await t.commit();
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }
}
