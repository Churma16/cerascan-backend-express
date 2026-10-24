import sequelize from "../../../config/databaseClient";
import { Payment } from "../../../models";
import { parseOrderId } from "../domain/payment.domain";
import { UserPlanLifecycleService } from "../../../services/userPlanLifecycle.service";
import { log } from "../../../utils/logger";

export class ProcessPaymentWebhookUseCase {
    async execute(eventData: any) {
        if (!eventData || !eventData.orderId) {
            log.error('PaymentWebhook', 'Payload webhook tidak memiliki orderId');
            return;
        }

        const { userId, planId } = parseOrderId(eventData.orderId);

        if (!userId || isNaN(userId) || !planId || isNaN(planId)) {
            throw new Error(`Format order ID tidak valid: ${eventData.orderId}`);
        }

        const existingSettledPayment = await Payment.findOne({
            where: {
                order_id: eventData.orderId,
                status: 'settlement',
            },
        });

        if (existingSettledPayment) {
            log.info('PaymentWebhook', `Order ID ${eventData.orderId} sudah pernah diproses (Idempotent).`);
            return;
        }

        const transaction = await sequelize.transaction();

        try {
            const [paymentRecord, created] = await Payment.findOrCreate({
                where: { order_id: eventData.orderId },
                defaults: {
                    user_id: userId,
                    plan_id: planId,
                    order_id: eventData.orderId,
                    transaction_id: eventData.transactionId,
                    amount: eventData.amount,
                    payment_type: eventData.payment_type,
                    status: eventData.status || 'settlement',
                },
                transaction,
            });

            if (!created) {
                paymentRecord.status = eventData.status || 'settlement';
                paymentRecord.transaction_id = eventData.transactionId || paymentRecord.transaction_id;
                paymentRecord.payment_type = eventData.payment_type || paymentRecord.payment_type;
                paymentRecord.amount = eventData.amount || paymentRecord.amount;
                await paymentRecord.save({ transaction });
            }

            await UserPlanLifecycleService.assignPlan(userId, planId, {
                acquisitionMethod: eventData.payment_type || 'midtrans_payment',
                note: `Pembayaran terverifikasi Midtrans. Order ID: ${eventData.orderId}`,
                transaction,
            });

            await transaction.commit();
            log.success('PaymentWebhook', `Order ID ${eventData.orderId} berhasil diproses dan disinkronkan.`);
        } catch (error) {
            await transaction.rollback();
            log.error('PaymentWebhook', `Gagal memproses webhook pembayaran untuk Order ID ${eventData.orderId}:`, error);
            throw error;
        }
    }
}
