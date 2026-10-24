import { Request, Response } from "express";
import { subscriptionService } from "../services/subscription.service";
import { sendResponse } from "../utils/response.util";
import { AuthRequest } from "../middleware/auth.middleware";
import {
    CreateSubscriptionDto,
    UpdateSubscriptionDto,
    SubscriptionIdParamDto,
    GiveSubscriptionDto
} from "../schemas/subscription.schema";
import { UserIdParamDto } from "../schemas/quota.schema";

export class SubscriptionController {
    static async create(req: Request, res: Response) {
        try {
            const { user_id, plan_id, status, acquisition_method, note } = req.body as CreateSubscriptionDto;
            const newSubscription = await subscriptionService.createSubscription(
                user_id,
                plan_id,
                status,
                acquisition_method,
                note
            );
            return sendResponse(res, 201, "Subscription berhasil dibuat", newSubscription);
        } catch (error: any) {
            return sendResponse(res, 500, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async getAll(req: Request, res: Response) {
        try {
            const subscriptions = await subscriptionService.getAllSubscriptions();
            return sendResponse(res, 200, "Daftar subscription aktif berhasil diambil", subscriptions);
        } catch (error: any) {
            return sendResponse(res, 500, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async getById(req: Request, res: Response) {
        try {
            const { id } = req.params as unknown as SubscriptionIdParamDto;
            const subscription = await subscriptionService.getSubscriptionById(id);
            return sendResponse(res, 200, "Subscription berhasil diambil", subscription);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async getByUserId(req: Request, res: Response) {
        try {
            const { user_id } = req.params as unknown as UserIdParamDto;
            const subscriptions = await subscriptionService.getSubscriptionsByUserId(user_id);
            return sendResponse(res, 200, "Daftar subscription user berhasil diambil", subscriptions);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async update(req: Request, res: Response) {
        try {
            const { id } = req.params as unknown as SubscriptionIdParamDto;
            const payload = req.body as UpdateSubscriptionDto;
            const updatedSubscription = await subscriptionService.updateSubscription(id, payload);
            return sendResponse(res, 200, "Subscription berhasil diupdate", updatedSubscription);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async delete(req: Request, res: Response) {
        try {
            const { id } = req.params as unknown as SubscriptionIdParamDto;
            const result = await subscriptionService.deleteSubscription(id);
            return sendResponse(res, 200, result.message, null);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async getCurrentUserActivePlan(req: AuthRequest, res: Response) {
        try {
            const authenticatedUserId = req.user?.id;
            if (!authenticatedUserId) {
                return sendResponse(res, 401, "Pengguna tidak terautentikasi");
            }

            const activeSubscription = await subscriptionService.getActiveSubscriptionByUserId(authenticatedUserId);
            return sendResponse(res, 200, "Subscription aktif berhasil diambil", activeSubscription);
        } catch (error: any) {
            return sendResponse(res, 500, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async getCurrentUserSubscriptionHistory(req: AuthRequest, res: Response) {
        try {
            const authenticatedUserId = req.user?.id;
            if (!authenticatedUserId) {
                return sendResponse(res, 401, "Pengguna tidak terautentikasi");
            }

            const subscriptionHistory = await subscriptionService.getSubscriptionsByUserId(authenticatedUserId);
            return sendResponse(res, 200, "Riwayat subscription berhasil diambil", subscriptionHistory);
        } catch (error: any) {
            return sendResponse(res, 500, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async giveSubscription(req: Request, res: Response) {
        try {
            const { user_id, plan_id, acquisition_method, note } = req.body as GiveSubscriptionDto;
            const result = await subscriptionService.giveSubscription(user_id, plan_id, acquisition_method, note);
            return sendResponse(res, 200, "Subscription berhasil diberikan", result);
        } catch (error: any) {
            return sendResponse(res, 500, error.message || "Terjadi kesalahan pada server");
        }
    }
}
