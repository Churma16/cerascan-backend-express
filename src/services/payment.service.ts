import { literal, Op } from "sequelize";
import sequelize from "../config/databaseClient";
import { snap } from "../config/midtransClient";
import { paymentRepository, PaymentRepository } from "../repositories/payment.repository";
import { userRepository, UserRepository } from "../repositories/user.repository";
import { planRepository, PlanRepository } from "../repositories/plan.repository";
import { RabbitmqPublisher } from "../transport/rabbitmq/infrastructure/rabbitmq.publisher";
import { UserPlanLifecycleService } from "./userPlanLifecycle.service";
import { Payment } from "../models";
import { PaymentAttributes } from "../models/payment.model";
import { log } from "../utils/logger";

export interface CreateCheckoutResult {
    token: string;
    redirect_url: string;
}

export interface PaymentKpiResult {
    revenue: {
        total: number;
        growth_percentage: number;
        is_positive: boolean;
    };
    payments: {
        successful: number;
        pending: number;
    };
}

export class PaymentService {
    private paymentRepo: PaymentRepository;
    private userRepo: UserRepository;
    private planRepo: PlanRepository;

    constructor(
        paymentRepo: PaymentRepository = paymentRepository,
        userRepo: UserRepository = userRepository,
        planRepo: PlanRepository = planRepository
    ) {
        this.paymentRepo = paymentRepo;
        this.userRepo = userRepo;
        this.planRepo = planRepo;
    }

    private parseOrderId(orderId: string): { userId: number | null; planId: number | null } {
        const parts = orderId.split("-");
        if (parts.length >= 3) {
            const userId = parseInt(parts[1], 10);
            const planId = parseInt(parts[2], 10);
            return {
                userId: isNaN(userId) ? null : userId,
                planId: isNaN(planId) ? null : planId
            };
        }
        return { userId: null, planId: null };
    }

    async createCheckoutTransaction(userId: number, planId: number): Promise<CreateCheckoutResult> {
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw new Error("User tidak ditemukan");
        }

        const selectedPlan = await this.planRepo.findByPk(planId);
        if (!selectedPlan) {
            throw new Error(`Plan dengan ID ${planId} tidak ditemukan`);
        }

        const secureAmount = selectedPlan.price;
        const orderId = `ORDER-${userId}-${planId}-${Date.now()}`;

        const transactionParameter = {
            transaction_details: {
                order_id: orderId,
                gross_amount: secureAmount
            },
            item_details: [{
                id: selectedPlan.id,
                price: secureAmount,
                quantity: 1,
                name: selectedPlan.name
            }],
            customer_details: {
                first_name: `User ID: ${userId}`,
                email: user.email
            }
        };

        const midtransTransaction = await snap.createTransaction(transactionParameter);

        return {
            token: midtransTransaction.token,
            redirect_url: midtransTransaction.redirect_url
        };
    }

    async handleMidtransWebhook(notificationPayload: any): Promise<void> {
        const statusResponse = await snap.transaction.notification(notificationPayload);

        const orderId = statusResponse.order_id;
        const transactionStatus = statusResponse.transaction_status;
        const fraudStatus = statusResponse.fraud_status;
        const transactionId = statusResponse.transaction_id;
        const amount = statusResponse.gross_amount;
        const paymentType = statusResponse.payment_type;

        if (transactionStatus === "capture" || transactionStatus === "settlement") {
            if (fraudStatus === "accept" || !fraudStatus) {
                const eventData = {
                    orderId,
                    transactionId,
                    amount,
                    payment_type: paymentType,
                    status: transactionStatus,
                    timestamp: new Date().toISOString()
                };

                await RabbitmqPublisher.publishEvent("payment.success", eventData);
            }
        } else if (["deny", "cancel", "expire"].includes(transactionStatus)) {
            const eventData = {
                orderId,
                transactionId,
                status: transactionStatus,
                timestamp: new Date().toISOString()
            };
            await RabbitmqPublisher.publishEvent("payment.failed", eventData);
        }
    }

    async processPaymentWebhookEvent(eventData: any): Promise<void> {
        if (!eventData || !eventData.orderId) {
            log.error("PaymentWebhook", "Payload webhook tidak memiliki orderId");
            return;
        }

        const { userId, planId } = this.parseOrderId(eventData.orderId);

        if (!userId || !planId) {
            throw new Error(`Format order ID tidak valid: ${eventData.orderId}`);
        }

        const existingSettledPayment = await this.paymentRepo.findOne({
            where: {
                order_id: eventData.orderId,
                status: "settlement"
            }
        });

        if (existingSettledPayment) {
            log.info("PaymentWebhook", `Order ID ${eventData.orderId} sudah pernah diproses (Idempotent).`);
            return;
        }

        const dbTransaction = await sequelize.transaction();

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
                    status: eventData.status || "settlement"
                },
                transaction: dbTransaction
            });

            if (!created) {
                paymentRecord.status = eventData.status || "settlement";
                paymentRecord.transaction_id = eventData.transactionId || paymentRecord.transaction_id;
                paymentRecord.payment_type = eventData.payment_type || paymentRecord.payment_type;
                paymentRecord.amount = eventData.amount || paymentRecord.amount;
                await paymentRecord.save({ transaction: dbTransaction });
            }

            await UserPlanLifecycleService.assignPlan(userId, planId, {
                acquisitionMethod: eventData.payment_type || "midtrans_payment",
                note: `Pembayaran terverifikasi Midtrans. Order ID: ${eventData.orderId}`,
                transaction: dbTransaction
            });

            await dbTransaction.commit();
            log.success("PaymentWebhook", `Order ID ${eventData.orderId} berhasil diproses dan disinkronkan.`);
        } catch (error) {
            await dbTransaction.rollback();
            log.error("PaymentWebhook", `Gagal memproses webhook pembayaran untuk Order ID ${eventData.orderId}:`, error);
            throw error;
        }
    }

    async getAllPayments(): Promise<Payment[]> {
        return await this.paymentRepo.findAll({
            order: [["created_at", "DESC"]]
        });
    }

    async getPaymentsByUserId(userId: number): Promise<Payment[]> {
        return await this.paymentRepo.findAll({
            where: { user_id: userId },
            order: [["created_at", "DESC"]]
        });
    }

    async getPaymentById(id: number): Promise<Payment | null> {
        return await this.paymentRepo.findById(id);
    }

    async getPaymentByOrderId(orderId: string): Promise<Payment | null> {
        return await this.paymentRepo.findOne({
            where: { order_id: orderId }
        });
    }

    async createPayment(payload: Partial<PaymentAttributes>): Promise<Payment> {
        return await this.paymentRepo.create(payload);
    }

    async updatePaymentStatus(id: number, status: string): Promise<boolean> {
        const affectedRows = await this.paymentRepo.update(id, { status: status as any });
        return affectedRows > 0;
    }

    async deletePayment(id: number): Promise<boolean> {
        return await this.paymentRepo.destroy(id);
    }

    async getPaymentKpi(): Promise<PaymentKpiResult> {
        const now = new Date();
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const thisMonthKpi: any = await this.paymentRepo.findAll({
            attributes: [
                [
                    literal(`SUM(CASE WHEN status IN ('settlement', 'capture', 'success') THEN amount ELSE 0 END)`),
                    "total_revenue"
                ],
                [
                    literal(`SUM(CASE WHEN status IN ('settlement', 'capture', 'success') THEN 1 ELSE 0 END)`),
                    "successful_trx"
                ],
                [
                    literal(`SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)`),
                    "pending_trx"
                ]
            ],
            where: {
                created_at: {
                    [Op.gte]: startOfThisMonth
                }
            },
            raw: true
        });

        const lastMonthKpi: any = await this.paymentRepo.findAll({
            attributes: [
                [
                    literal(`SUM(CASE WHEN status IN ('settlement', 'capture', 'success') THEN amount ELSE 0 END)`),
                    "total_revenue"
                ]
            ],
            where: {
                created_at: {
                    [Op.gte]: startOfLastMonth,
                    [Op.lt]: startOfThisMonth
                }
            },
            raw: true
        });

        const currentRevenue = Number(thisMonthKpi[0]?.total_revenue || 0);
        const lastRevenue = Number(lastMonthKpi[0]?.total_revenue || 0);
        const successfulTrx = Number(thisMonthKpi[0]?.successful_trx || 0);
        const pendingTrx = Number(thisMonthKpi[0]?.pending_trx || 0);

        let growthPercentage = 0;
        if (lastRevenue > 0) {
            growthPercentage = ((currentRevenue - lastRevenue) / lastRevenue) * 100;
        } else if (currentRevenue > 0) {
            growthPercentage = 100;
        }

        return {
            revenue: {
                total: currentRevenue,
                growth_percentage: parseFloat(growthPercentage.toFixed(1)),
                is_positive: growthPercentage >= 0
            },
            payments: {
                successful: successfulTrx,
                pending: pendingTrx
            }
        };
    }
}

export const paymentService = new PaymentService();
