import { Request, Response } from "express";
import { sendResponse } from "../../utils/response";
import { AuthRequest } from "../../middleware/auth.guard";
import { getRedisClient } from "../../config/redis_client";
import sequelize from "../../config/database";

import { CreateSubscriptionUseCase } from "./use-cases/CreateSubscriptionUseCase";
import { GetAllSubscriptionsUseCase } from "./use-cases/GetAllSubscriptionsUseCase";
import { GetSubscriptionByIdUseCase } from "./use-cases/GetSubscriptionByIdUseCase";
import { GetSubscriptionByUserIdUseCase } from "./use-cases/GetSubscriptionByUserIdUseCase";
import { UpdateSubscriptionUseCase } from "./use-cases/UpdateSubscriptionUseCase";
import { DeleteSubscriptionUseCase } from "./use-cases/DeleteSubscriptionUseCase";
import { GetActiveSubscriptionUseCase } from "./use-cases/GetActiveSubscriptionUseCase";
import { ChangeActiveSubsStatusUseCase } from "./use-cases/ChangeActiveSubsStatusUseCase";
import { InitiateFreePlanUseCase } from "./use-cases/InitiateFreePlanUseCase";
import { UpgradeTierUseCase } from "../user/use-cases/UpgradeTierUseCase";
import { CreateUserQuotaFromPaymentUseCase } from "../user_quota/use-cases/CreateUserQuotaFromPaymentUseCase";
import { UpsertUserQuotaToRedisUseCase } from "../user_quota/use-cases/UpsertUserQuotaToRedisUseCase";

export class SubscriptionController {
    static async create(req: Request, res: Response) {
        try {
            const { user_id, plan_id, status, acquisition_method, note } = req.body;
            if (!user_id || !plan_id) {
                return sendResponse(res, 400, "user_id dan plan_id wajib diisi");
            }

            const useCase = new CreateSubscriptionUseCase();
            const newSubscription = await useCase.execute(
                user_id,
                plan_id,
                status || 'active',
                acquisition_method || 'midtrans_payment',
                note
            );

            return sendResponse(res, 201, "Subscription berhasil dibuat", newSubscription);
        } catch (error: any) {
            return sendResponse(res, 500, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async getAll(req: Request, res: Response) {
        try {
            const useCase = new GetAllSubscriptionsUseCase();
            const subscriptions = await useCase.execute();
            return sendResponse(res, 200, "Daftar subscription aktif berhasil diambil", subscriptions);
        } catch (error: any) {
            return sendResponse(res, 500, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async getById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            if (!id || isNaN(Number(id))) {
                return sendResponse(res, 400, "ID subscription harus berupa angka yang valid");
            }

            const useCase = new GetSubscriptionByIdUseCase();
            const subscription = await useCase.execute(Number(id));
            return sendResponse(res, 200, "Subscription berhasil diambil", subscription);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async getByUserId(req: Request, res: Response) {
        try {
            const { user_id } = req.params;
            if (!user_id || isNaN(Number(user_id))) {
                return sendResponse(res, 400, "User ID harus berupa angka yang valid");
            }

            const useCase = new GetSubscriptionByUserIdUseCase();
            const subscriptions = await useCase.execute(Number(user_id));
            return sendResponse(res, 200, "Daftar subscription user berhasil diambil", subscriptions);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            if (!id || isNaN(Number(id))) {
                return sendResponse(res, 400, "ID subscription harus berupa angka yang valid");
            }

            const { status, plan_id, note } = req.body;
            const payload: any = {};
            if (status !== undefined) payload.status = status;
            if (plan_id !== undefined) payload.plan_id = plan_id;
            if (note !== undefined) payload.note = note;

            if (Object.keys(payload).length === 0) {
                return sendResponse(res, 400, "Minimal satu field harus diupdate");
            }

            const useCase = new UpdateSubscriptionUseCase();
            const updatedSubscription = await useCase.execute(Number(id), payload);
            return sendResponse(res, 200, "Subscription berhasil diupdate", updatedSubscription);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            if (!id || isNaN(Number(id))) {
                return sendResponse(res, 400, "ID subscription harus berupa angka yang valid");
            }

            const useCase = new DeleteSubscriptionUseCase();
            const result = await useCase.execute(Number(id));
            return sendResponse(res, 200, result.message, null);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async getCurrentUserActivePlan(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return sendResponse(res, 400, "User ID tidak valid");
            }

            const useCase = new GetActiveSubscriptionUseCase();
            const activeSubs = await useCase.execute(userId);

            return sendResponse(res, 200, "Subscription aktif berhasil diambil", activeSubs);
        } catch (error: any) {
            return sendResponse(res, 500, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async getCurrentUserSubscriptionHistory(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return sendResponse(res, 400, "User ID tidak valid");
            }

            const useCase = new GetSubscriptionByUserIdUseCase();
            const subsHistory = await useCase.execute(userId);

            return sendResponse(res, 200, "Riwayat subscription berhasil diambil", subsHistory);
        } catch (error: any) {
            return sendResponse(res, 500, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async giveSubscription(req: Request, res: Response) {
        const { user_id, plan_id, acquisition_method, note } = req.body;
        if (!user_id || !plan_id) {
            return sendResponse(res, 400, "User ID dan Plan ID harus diisi");
        }

        const t = await sequelize.transaction();

        try {
            const changeActiveSubsStatusUseCase = new ChangeActiveSubsStatusUseCase();
            await changeActiveSubsStatusUseCase.execute(user_id, "canceled", t);

            const createSubscriptionUseCase = new CreateSubscriptionUseCase();
            const subscription = await createSubscriptionUseCase.execute(
                user_id,
                plan_id,
                'active',
                acquisition_method,
                note,
                t
            );

            const upgradeTierUseCase = new UpgradeTierUseCase();
            const user = await upgradeTierUseCase.execute(user_id, plan_id, t);

            const createUserQuotaFromPaymentUseCase = new CreateUserQuotaFromPaymentUseCase();
            const userQuota = await createUserQuotaFromPaymentUseCase.execute(user_id, plan_id, t);

            const upsertUserQuotaToRedisUseCase = new UpsertUserQuotaToRedisUseCase();
            const newQuotaRedis = await upsertUserQuotaToRedisUseCase.execute(user_id, userQuota.total_quota);

            await t.commit();
            return sendResponse(
                res,
                200,
                "Subscription berhasil diberikan",
                { subscription, user, userQuota, newQuotaRedis }
            );
        } catch (error: any) {
            await t.rollback();
            try {
                const redis = getRedisClient();
                await redis.del(`user:${user_id}:remaining_quota`);
            } catch (redisErr) {
                console.error("Gagal menghapus cache Redis setelah rollback giveSubscription:", redisErr);
            }
            return sendResponse(res, 500, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async initiateDefaultFreePlan(req: Request, res: Response) {
        try {
            const { user_id } = req.body;
            if (!user_id) {
                return sendResponse(res, 400, "user_id wajib diisi");
            }

            const useCase = new InitiateFreePlanUseCase();
            const result = await useCase.execute(user_id);
            return sendResponse(res, 201, "Free plan default berhasil diaktifkan", result);
        } catch (error: any) {
            return sendResponse(res, 500, error.message || "Terjadi kesalahan pada server");
        }
    }
}
