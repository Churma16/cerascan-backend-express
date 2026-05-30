import {Request, Response} from "express";
import {sendResponse} from "../../utils/response";
import {SubscriptionService} from "./subscription.service";
import {AuthRequest} from "../../middleware/auth.guard";

export class SubscriptionController {

    static async create(req: Request, res: Response) {
        try {
            const {user_id, plan_id, start_date, end_date} = req.body;
            if (!user_id || !plan_id || !start_date || !end_date) {
                return sendResponse(res, 400, "Semua field (user_id, plan_id, start_date, end_date) harus diisi");
            }

            const newSubscription = await SubscriptionService.createSubscription(user_id, plan_id, 'active');
            return sendResponse(res, 201, "Subscription berhasil dibuat", newSubscription);
        } catch (error: any) {
            return sendResponse(res, 500, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async getAll(req: Request, res: Response) {
        try {
            const subscriptions = await SubscriptionService.getAllSubscriptions();
            return sendResponse(res, 200, "Daftar subscription berhasil diambil", subscriptions);
        } catch (error: any) {
            return sendResponse(res, 500, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async getById(req: Request, res: Response) {
        try {
            const {id} = req.params;
            if (!id || isNaN(Number(id))) {
                return sendResponse(res, 400, "ID subscription harus berupa angka yang valid");
            }
            const subscription = await SubscriptionService.getSubscriptionById(Number(id));
            return sendResponse(res, 200, "Subscription berhasil diambil", subscription);
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
            const subscriptions = await SubscriptionService.getSubscriptionByUserId(Number(user_id));
            return sendResponse(res, 200, "Subscription user berhasil diambil", subscriptions);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async update(req: Request, res: Response) {
        try {
            const {id} = req.params;
            if (!id || isNaN(Number(id))) {
                return sendResponse(res, 400, "ID subscription harus berupa angka yang valid");
            }
            const {status, end_date} = req.body;
            const payload: any = {};
            if (status !== undefined) payload.status = status;
            if (end_date !== undefined) payload.end_date = end_date;

            if (Object.keys(payload).length === 0) {
                return sendResponse(res, 400, "Minimal satu field harus diupdate");
            }

            const updatedSubscription = await SubscriptionService.updateSubscription(Number(id), payload);
            return sendResponse(res, 200, "Subscription berhasil diupdate", updatedSubscription);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async delete(req: Request, res: Response) {
        try {
            const {id} = req.params;
            if (!id || isNaN(Number(id))) {
                return sendResponse(res, 400, "ID subscription harus berupa angka yang valid");
            }
            const result = await SubscriptionService.deleteSubscription(Number(id));
            return sendResponse(res, 200, result.message, null);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async getCurrentUserActivePlan(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.id;
            console.log(userId);
            const activePlan = await SubscriptionService.getActiveSubscriptionsByUserId(userId)

            return sendResponse(res, 200, "Subscription aktif berhasil diambil", activePlan);
        } catch (error: any) {
            return sendResponse(res, 500, error);
        }
    }

    static async getCurrentUserSubscriptionHistory(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.id;

            const subsHistory = await SubscriptionService.getSubscriptionByUserId(userId);

            return sendResponse(res, 200, "Riwayat subscription berhasil diambil", subsHistory);
        } catch (error: any) {
            return sendResponse(res, 500, error);
        }
    }
}

