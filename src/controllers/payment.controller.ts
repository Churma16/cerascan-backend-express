import { Request, Response } from "express";
import { paymentService } from "../services/payment.service";
import { sendResponse } from "../utils/response";
import { AuthRequest } from "../middleware/auth.middleware";

export class PaymentController {
    static async createTransaction(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return sendResponse(res, 400, "User ID tidak boleh kosong");
            }

            const planId = Number(req.body.plan_id);
            if (!planId || isNaN(planId)) {
                return sendResponse(res, 400, "Plan ID harus diisi dan valid");
            }

            const checkoutResult = await paymentService.createCheckoutTransaction(userId, planId);

            return sendResponse(res, 200, "Token transaksi berhasil dibuat", checkoutResult);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async handleWebhook(req: Request, res: Response) {
        try {
            await paymentService.handleMidtransWebhook(req.body);
            return sendResponse(res, 200, "Webhook berhasil diproses");
        } catch (error: any) {
            console.error("[Payment Webhook Error]:", error);
            return sendResponse(res, 500, error.message);
        }
    }

    static async getAll(req: Request, res: Response) {
        try {
            const payments = await paymentService.getAllPayments();
            return sendResponse(res, 200, "Data pembayaran berhasil diambil", payments);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async getById(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);
            if (isNaN(id)) {
                return sendResponse(res, 400, "ID harus berupa angka");
            }

            const payment = await paymentService.getPaymentById(id);
            if (!payment) {
                return sendResponse(res, 404, "Pembayaran tidak ditemukan");
            }

            return sendResponse(res, 200, "Data pembayaran berhasil diambil", payment);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async getByOrderId(req: Request, res: Response) {
        try {
            const orderId = req.params.order_id as string;
            const payment = await paymentService.getPaymentByOrderId(orderId);
            if (!payment) {
                return sendResponse(res, 404, "Pembayaran tidak ditemukan");
            }

            return sendResponse(res, 200, "Data pembayaran berhasil diambil", payment);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async getByUserId(req: Request, res: Response) {
        try {
            const userId = Number(req.params.user_id);
            if (isNaN(userId)) {
                return sendResponse(res, 400, "User ID harus berupa angka");
            }

            const payments = await paymentService.getPaymentsByUserId(userId);
            return sendResponse(res, 200, "Data pembayaran pengguna berhasil diambil", payments);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async getCurrentUserPaymentHistories(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return sendResponse(res, 401, "Pengguna tidak terautentikasi");
            }

            const payments = await paymentService.getPaymentsByUserId(userId);
            return sendResponse(res, 200, "Riwayat pembayaran Anda berhasil diambil", payments);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async create(req: Request, res: Response) {
        try {
            const newPayment = await paymentService.createPayment(req.body);
            return sendResponse(res, 201, "Pembayaran berhasil dicatat", newPayment);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async updateStatus(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);
            const { status } = req.body;

            if (isNaN(id) || !status) {
                return sendResponse(res, 400, "ID dan status harus diisi");
            }

            const success = await paymentService.updatePaymentStatus(id, status);
            if (!success) {
                return sendResponse(res, 404, "Pembayaran tidak ditemukan");
            }

            return sendResponse(res, 200, "Status pembayaran berhasil diperbarui");
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async delete(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);
            if (isNaN(id)) {
                return sendResponse(res, 400, "ID harus berupa angka");
            }

            const success = await paymentService.deletePayment(id);
            if (!success) {
                return sendResponse(res, 404, "Pembayaran tidak ditemukan");
            }

            return sendResponse(res, 200, "Data pembayaran berhasil dihapus");
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async getPaymentKpi(req: Request, res: Response) {
        try {
            const kpi = await paymentService.getPaymentKpi();
            return sendResponse(res, 200, "KPI pembayaran berhasil diambil", kpi);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }
}
