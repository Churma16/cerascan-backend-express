import { PaymentService } from "./payment.service";
import { PaymentRepository } from "../repositories/payment.repository";
import { UserRepository } from "../repositories/user.repository";
import { PlanRepository } from "../repositories/plan.repository";
import { snap } from "../config/midtransClient";
import { RabbitmqPublisher } from "../transport/rabbitmq/infrastructure/rabbitmq.publisher";
import { UserPlanLifecycleService } from "./userPlanLifecycle.service";
import { Payment } from "../models";
import sequelize from "../config/databaseClient";

jest.mock("../config/databaseClient", () => ({
    transaction: jest.fn()
}));

jest.mock("../config/midtransClient", () => ({
    snap: {
        createTransaction: jest.fn(),
        transaction: {
            notification: jest.fn()
        }
    }
}));

jest.mock("../transport/rabbitmq/infrastructure/rabbitmq.publisher", () => ({
    RabbitmqPublisher: {
        publishEvent: jest.fn()
    }
}));

jest.mock("./userPlanLifecycle.service", () => ({
    UserPlanLifecycleService: {
        assignPlan: jest.fn()
    }
}));

jest.mock("../models", () => ({
    Payment: {
        findOrCreate: jest.fn()
    }
}));

jest.mock("../utils/logger", () => ({
    log: {
        info: jest.fn(),
        error: jest.fn(),
        success: jest.fn(),
        warn: jest.fn()
    }
}));

describe("PaymentService", () => {
    let paymentService: PaymentService;
    let mockPaymentRepo: jest.Mocked<PaymentRepository>;
    let mockUserRepo: jest.Mocked<UserRepository>;
    let mockPlanRepo: jest.Mocked<PlanRepository>;

    let mockDbTransaction: {
        commit: jest.Mock;
        rollback: jest.Mock;
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockDbTransaction = {
            commit: jest.fn().mockResolvedValue(true),
            rollback: jest.fn().mockResolvedValue(true)
        };

        (sequelize.transaction as jest.Mock).mockResolvedValue(mockDbTransaction);

        mockPaymentRepo = {
            findOne: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            destroy: jest.fn()
        } as unknown as jest.Mocked<PaymentRepository>;

        mockUserRepo = {
            findById: jest.fn()
        } as unknown as jest.Mocked<UserRepository>;

        mockPlanRepo = {
            findByPk: jest.fn()
        } as unknown as jest.Mocked<PlanRepository>;

        paymentService = new PaymentService(mockPaymentRepo, mockUserRepo, mockPlanRepo);
    });

    describe("createCheckoutTransaction", () => {
        it("should throw an error when target user does not exist", async () => {
            mockUserRepo.findById.mockResolvedValue(null);

            await expect(paymentService.createCheckoutTransaction(999, 1)).rejects.toThrow(
                "User tidak ditemukan"
            );
        });

        it("should throw an error when selected plan does not exist", async () => {
            mockUserRepo.findById.mockResolvedValue({ id: 101, email: "user@example.com" } as any);
            mockPlanRepo.findByPk.mockResolvedValue(null);

            await expect(paymentService.createCheckoutTransaction(101, 999)).rejects.toThrow(
                "Plan dengan ID 999 tidak ditemukan"
            );
        });

        it("should successfully generate checkout token and redirect url from Midtrans Snap", async () => {
            const sampleUser = { id: 101, email: "tester@example.com" } as any;
            const samplePlan = { id: 2, name: "Pro Plan", price: 50000 } as any;

            mockUserRepo.findById.mockResolvedValue(sampleUser);
            mockPlanRepo.findByPk.mockResolvedValue(samplePlan);

            const mockSnapResponse = {
                token: "snap_token_123456",
                redirect_url: "https://app.sandbox.midtrans.com/snap/v2/vtweb/snap_token_123456"
            };
            (snap.createTransaction as jest.Mock).mockResolvedValue(mockSnapResponse);

            const checkoutResult = await paymentService.createCheckoutTransaction(101, 2);

            expect(checkoutResult).toEqual(mockSnapResponse);
            expect(snap.createTransaction).toHaveBeenCalledWith(
                expect.objectContaining({
                    transaction_details: expect.objectContaining({
                        gross_amount: 50000
                    }),
                    item_details: [
                        {
                            id: 2,
                            price: 50000,
                            quantity: 1,
                            name: "Pro Plan"
                        }
                    ],
                    customer_details: {
                        first_name: "User ID: 101",
                        email: "tester@example.com"
                    }
                })
            );
        });
    });

    describe("handleMidtransWebhook", () => {
        it("should publish payment.success event to RabbitMQ when transaction is settled and fraud status is accepted", async () => {
            const mockNotificationResponse = {
                order_id: "ORDER-101-2-1718000000",
                transaction_status: "settlement",
                fraud_status: "accept",
                transaction_id: "trx_midtrans_999",
                gross_amount: "50000.00",
                payment_type: "qris"
            };

            (snap.transaction.notification as jest.Mock).mockResolvedValue(mockNotificationResponse);

            await paymentService.handleMidtransWebhook({ signature_key: "valid_signature" });

            expect(RabbitmqPublisher.publishEvent).toHaveBeenCalledWith(
                "payment.success",
                expect.objectContaining({
                    orderId: "ORDER-101-2-1718000000",
                    transactionId: "trx_midtrans_999",
                    status: "settlement",
                    amount: "50000.00",
                    payment_type: "qris"
                })
            );
        });

        it("should publish payment.failed event when transaction status is deny, cancel, or expire", async () => {
            const mockNotificationResponse = {
                order_id: "ORDER-101-2-1718000000",
                transaction_status: "expire",
                transaction_id: "trx_midtrans_999"
            };

            (snap.transaction.notification as jest.Mock).mockResolvedValue(mockNotificationResponse);

            await paymentService.handleMidtransWebhook({ signature_key: "valid_signature" });

            expect(RabbitmqPublisher.publishEvent).toHaveBeenCalledWith(
                "payment.failed",
                expect.objectContaining({
                    orderId: "ORDER-101-2-1718000000",
                    transactionId: "trx_midtrans_999",
                    status: "expire"
                })
            );
        });

        it("should not publish events when transaction status is pending", async () => {
            const mockNotificationResponse = {
                order_id: "ORDER-101-2-1718000000",
                transaction_status: "pending",
                transaction_id: "trx_midtrans_999"
            };

            (snap.transaction.notification as jest.Mock).mockResolvedValue(mockNotificationResponse);

            await paymentService.handleMidtransWebhook({ signature_key: "valid_signature" });

            expect(RabbitmqPublisher.publishEvent).not.toHaveBeenCalled();
        });
    });

    describe("processPaymentWebhookEvent", () => {
        const validEventData = {
            orderId: "ORDER-101-2-1718000000",
            transactionId: "trx_midtrans_999",
            amount: 50000,
            payment_type: "qris",
            status: "settlement"
        };

        it("should return early when event payload is empty or missing orderId", async () => {
            await paymentService.processPaymentWebhookEvent(null);
            await paymentService.processPaymentWebhookEvent({ amount: 50000 });

            expect(mockPaymentRepo.findOne).not.toHaveBeenCalled();
            expect(sequelize.transaction).not.toHaveBeenCalled();
        });

        it("should throw an error when orderId format cannot be parsed into userId and planId", async () => {
            const invalidFormatEvent = {
                orderId: "MALFORMED_ORDER_IDENTIFIER"
            };

            await expect(paymentService.processPaymentWebhookEvent(invalidFormatEvent)).rejects.toThrow(
                "Format order ID tidak valid: MALFORMED_ORDER_IDENTIFIER"
            );
        });

        it("should prevent double processing and return early when payment is already settled (Idempotency)", async () => {
            mockPaymentRepo.findOne.mockResolvedValue({
                id: 1,
                order_id: validEventData.orderId,
                status: "settlement"
            } as any);

            await paymentService.processPaymentWebhookEvent(validEventData);

            expect(mockPaymentRepo.findOne).toHaveBeenCalledWith({
                where: {
                    order_id: validEventData.orderId,
                    status: "settlement"
                }
            });
            expect(sequelize.transaction).not.toHaveBeenCalled();
            expect(UserPlanLifecycleService.assignPlan).not.toHaveBeenCalled();
        });

        it("should record payment, assign plan to user, and commit transaction on successful payment", async () => {
            mockPaymentRepo.findOne.mockResolvedValue(null);

            const mockCreatedPaymentRecord = {
                id: 10,
                order_id: validEventData.orderId,
                status: "settlement",
                save: jest.fn().mockResolvedValue(true)
            };
            (Payment.findOrCreate as jest.Mock).mockResolvedValue([mockCreatedPaymentRecord, true]);
            (UserPlanLifecycleService.assignPlan as jest.Mock).mockResolvedValue(true);

            await paymentService.processPaymentWebhookEvent(validEventData);

            expect(sequelize.transaction).toHaveBeenCalled();
            expect(Payment.findOrCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { order_id: validEventData.orderId },
                    transaction: mockDbTransaction
                })
            );
            expect(UserPlanLifecycleService.assignPlan).toHaveBeenCalledWith(
                101,
                2,
                expect.objectContaining({
                    acquisitionMethod: "qris",
                    transaction: mockDbTransaction
                })
            );
            expect(mockDbTransaction.commit).toHaveBeenCalled();
            expect(mockDbTransaction.rollback).not.toHaveBeenCalled();
        });

        it("should rollback transaction and propagate error when plan assignment fails", async () => {
            mockPaymentRepo.findOne.mockResolvedValue(null);

            const mockPaymentRecord = {
                id: 10,
                order_id: validEventData.orderId,
                status: "settlement",
                save: jest.fn().mockResolvedValue(true)
            };
            (Payment.findOrCreate as jest.Mock).mockResolvedValue([mockPaymentRecord, true]);
            (UserPlanLifecycleService.assignPlan as jest.Mock).mockRejectedValue(
                new Error("Database write lock timeout")
            );

            await expect(paymentService.processPaymentWebhookEvent(validEventData)).rejects.toThrow(
                "Database write lock timeout"
            );

            expect(mockDbTransaction.rollback).toHaveBeenCalled();
            expect(mockDbTransaction.commit).not.toHaveBeenCalled();
        });
    });

    describe("CRUD operations", () => {
        it("should fetch all payments ordered by created_at descending", async () => {
            mockPaymentRepo.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }] as any);

            const paymentRecords = await paymentService.getAllPayments();

            expect(paymentRecords).toHaveLength(2);
            expect(mockPaymentRepo.findAll).toHaveBeenCalledWith({
                order: [["created_at", "DESC"]]
            });
        });

        it("should fetch payments by specific user id", async () => {
            mockPaymentRepo.findAll.mockResolvedValue([{ id: 1, user_id: 101 }] as any);

            const userPaymentRecords = await paymentService.getPaymentsByUserId(101);

            expect(userPaymentRecords).toHaveLength(1);
            expect(mockPaymentRepo.findAll).toHaveBeenCalledWith({
                where: { user_id: 101 },
                order: [["created_at", "DESC"]]
            });
        });

        it("should retrieve payment by primary key id", async () => {
            mockPaymentRepo.findById.mockResolvedValue({ id: 5 } as any);

            const paymentRecord = await paymentService.getPaymentById(5);

            expect(paymentRecord).toEqual({ id: 5 });
            expect(mockPaymentRepo.findById).toHaveBeenCalledWith(5);
        });

        it("should retrieve payment by order id string", async () => {
            mockPaymentRepo.findOne.mockResolvedValue({ id: 5, order_id: "ORDER-1" } as any);

            const paymentRecord = await paymentService.getPaymentByOrderId("ORDER-1");

            expect(paymentRecord).toEqual({ id: 5, order_id: "ORDER-1" });
            expect(mockPaymentRepo.findOne).toHaveBeenCalledWith({
                where: { order_id: "ORDER-1" }
            });
        });

        it("should create payment through repository", async () => {
            const creationPayload = { order_id: "ORDER-100", amount: 25000 } as any;
            mockPaymentRepo.create.mockResolvedValue(creationPayload);

            const createdRecord = await paymentService.createPayment(creationPayload);

            expect(createdRecord).toEqual(creationPayload);
            expect(mockPaymentRepo.create).toHaveBeenCalledWith(creationPayload);
        });

        it("should update payment status and return true when rows are affected", async () => {
            mockPaymentRepo.update.mockResolvedValue(1);

            const isUpdated = await paymentService.updatePaymentStatus(5, "settlement");

            expect(isUpdated).toBe(true);
            expect(mockPaymentRepo.update).toHaveBeenCalledWith(5, { status: "settlement" });
        });

        it("should delete payment and return true when deleted successfully", async () => {
            mockPaymentRepo.destroy.mockResolvedValue(true);

            const isDeleted = await paymentService.deletePayment(5);

            expect(isDeleted).toBe(true);
            expect(mockPaymentRepo.destroy).toHaveBeenCalledWith(5);
        });
    });

    describe("getPaymentKpi", () => {
        it("should calculate revenue growth correctly when previous month has revenue", async () => {
            mockPaymentRepo.findAll
                .mockResolvedValueOnce([
                    { total_revenue: "150000", successful_trx: "3", pending_trx: "1" }
                ] as any)
                .mockResolvedValueOnce([
                    { total_revenue: "100000" }
                ] as any);

            const kpiResult = await paymentService.getPaymentKpi();

            expect(kpiResult.revenue.total).toBe(150000);
            expect(kpiResult.revenue.growth_percentage).toBe(50);
            expect(kpiResult.revenue.is_positive).toBe(true);
            expect(kpiResult.payments.successful).toBe(3);
            expect(kpiResult.payments.pending).toBe(1);
        });

        it("should handle 100% growth when previous month revenue was zero", async () => {
            mockPaymentRepo.findAll
                .mockResolvedValueOnce([
                    { total_revenue: "50000", successful_trx: "1", pending_trx: "0" }
                ] as any)
                .mockResolvedValueOnce([
                    { total_revenue: "0" }
                ] as any);

            const kpiResult = await paymentService.getPaymentKpi();

            expect(kpiResult.revenue.total).toBe(50000);
            expect(kpiResult.revenue.growth_percentage).toBe(100);
            expect(kpiResult.revenue.is_positive).toBe(true);
        });
    });
});
