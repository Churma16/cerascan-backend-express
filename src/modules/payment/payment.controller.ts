import {Request, Response} from "express";
import {sendResponse} from "../../utils/response";
import {snap} from "../../config/midtrans_client";
import {AuthRequest} from "../../middleware/auth.guard";
import {RabbitMQService} from "../rabbitmq/rabbitmq.service";
import {PaymentService} from "./payment.service";
import {PlanService} from "../plan/plan.service";
import {UserService} from "../user/user.service";

export class PaymentController {
    static async createTransaction(req: AuthRequest, res: Response) {
        try {
            // Frontend cukup kirim userId yang sedang login
            const userId = req.user?.id;
            if (!userId) {
                return sendResponse(res, 400, "User ID tidak boleh kosong");
            }

            const user = await UserService.getUserById(userId);
            if (!user) {
                return sendResponse(res, 404, "User tidak ditemukan");
            }

            const planId: number = req.body.plan_id
            const selectedPlan = await PlanService.getPlanById(planId);
            if (!selectedPlan) {
                return sendResponse(res, 404, `Plan dengan ID ${planId} tidak ditemukan`);
            }


            // Harga dan detail diambil langsung dari config backend yang aman
            const secureAmount = selectedPlan.price
            const orderId = `ORDER-${userId}-${planId}-${Date.now()}`;

            const parameter = {
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

            // Generate token dari Midtrans
            const transaction = await snap.createTransaction(parameter);

            return sendResponse(res, 200, "Token transaksi berhasil dibuat", {
                token: transaction.token,
                redirect_url: transaction.redirect_url
            });
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async handleWebhook(req: Request, res: Response) {
        try {
            const notification = req.body;
            const statusResponse = await snap.transaction.notification(notification);

            const orderId = statusResponse.order_id;
            const transactionStatus = statusResponse.transaction_status;
            const fraudStatus = statusResponse.fraud_status;
            const transactionId = statusResponse.transaction_id;
            const amount = statusResponse.gross_amount;
            const paymentType = statusResponse.payment_type;

            if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
                if (fraudStatus === 'accept' || !fraudStatus) {

                    // Siapkan bungkusan data yang akan disiarkan dengan lengkap dari Midtrans
                    const eventData = {
                        orderId: orderId,
                        transactionId: transactionId,
                        amount: amount,
                        payment_type: paymentType,
                        status: transactionStatus,
                        timestamp: new Date().toISOString()
                    };

                    await RabbitMQService.publishEvent('payment.success', eventData);
                }
            }

            // Express bisa langsung merespons Midtrans dengan sangat cepat!
            return sendResponse(res, 200, "Webhook diterima, tugas dikirim ke antrean latar belakang");
        } catch (error: unknown) {
            if (error instanceof Error) {
                return sendResponse(res, 500, error.message);
            }
            return sendResponse(res, 500, "Terjadi kesalahan internal pada webhook");
        }
    }

    // ===== CRUD Payment Records =====

    static async create(req: Request, res: Response) {
        try {
            const {user_id, plan_id, order_id, amount, payment_type} = req.body;
            if (!user_id || !plan_id || !order_id || !amount) {
                return sendResponse(res, 400, "Field user_id, plan_id, order_id, amount harus diisi");
            }
            const payload = {user_id, plan_id, order_id, amount, payment_type, status: 'pending' as const};

            const newPayment = await PaymentService.createPayment(payload);
            return sendResponse(res, 201, "Payment berhasil dibuat", newPayment);
        } catch (error: any) {
            return sendResponse(res, 500, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async getAll(req: Request, res: Response) {
        try {
            const payments = await PaymentService.getAllPayments();
            return sendResponse(res, 200, "Daftar payment berhasil diambil", payments);
        } catch (error: any) {
            return sendResponse(res, 500, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async getById(req: Request, res: Response) {
        try {
            const {id} = req.params;
            if (!id || isNaN(Number(id))) {
                return sendResponse(res, 400, "ID payment harus berupa angka yang valid");
            }
            const payment = await PaymentService.getPaymentById(Number(id));
            return sendResponse(res, 200, "Payment berhasil diambil", payment);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async getByOrderId(req: Request, res: Response) {
        try {
            const orderIdParam = req.params.order_id;
            const order_id = Array.isArray(orderIdParam) ? orderIdParam[0] : orderIdParam;
            if (!order_id) {
                return sendResponse(res, 400, "Order ID harus diisi");
            }
            const payment = await PaymentService.getPaymentByOrderId(order_id);
            return sendResponse(res, 200, "Payment berhasil diambil", payment);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async getByUserId(req: Request, res: Response) {
        try {
            const {user_id} = req.params;
            if (!user_id || isNaN(Number(user_id))) {
                return sendResponse(res, 400, "User ID harus berupa angka yang valid");
            }
            const payments = await PaymentService.getPaymentByUserId(Number(user_id));
            return sendResponse(res, 200, "Payment user berhasil diambil", payments);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async updateStatus(req: Request, res: Response) {
        try {
            const {id} = req.params;
            if (!id || isNaN(Number(id))) {
                return sendResponse(res, 400, "ID payment harus berupa angka yang valid");
            }
            const {status, transaction_id} = req.body;
            if (!status) {
                return sendResponse(res, 400, "Status harus diisi");
            }

            const payload: any = {status};
            if (transaction_id !== undefined) payload.transaction_id = transaction_id;

            const updatedPayment = await PaymentService.updatePaymentStatus(Number(id), payload);
            return sendResponse(res, 200, "Payment status berhasil diupdate", updatedPayment);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async delete(req: Request, res: Response) {
        try {
            const {id} = req.params;
            if (!id || isNaN(Number(id))) {
                return sendResponse(res, 400, "ID payment harus berupa angka yang valid");
            }
            const result = await PaymentService.deletePayment(Number(id));
            return sendResponse(res, 200, result.message, null);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async getCurrentUserPaymentHistories(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const payments = await PaymentService.getPaymentByUserId(userId);
            return sendResponse(res, 200, "Riwayat pembayaran berhasil diambil", payments);
        } catch (error: any) {
            return sendResponse(res, 500, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async getPaymentKpi(req: Request, res: Response) {
        try {
            const paymentKpi = await PaymentService.getPaymentKpi();
            return sendResponse(res, 200, "KPI pembayaran berhasil diambil", paymentKpi);
        } catch (error: any) {
            return sendResponse(res, 500, error.message || "Terjadi kesalahan pada server");
        }
    }
}