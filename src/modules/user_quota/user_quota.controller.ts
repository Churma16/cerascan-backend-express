import { Request, Response } from "express";
import { sendResponse } from "../../utils/response";
import { AuthRequest } from "../../middleware/auth.guard";

import { CreateUserQuotaUseCase } from "./use-cases/CreateUserQuotaUseCase";
import { GetUserQuotaByUserIdUseCase } from "./use-cases/GetUserQuotaByUserIdUseCase";
import { UpdateUserQuotaUseCase } from "./use-cases/UpdateUserQuotaUseCase";
import { IncrementUsedQuotaUseCase } from "./use-cases/IncrementUsedQuotaUseCase";
import { ResetQuotaUseCase } from "./use-cases/ResetQuotaUseCase";
import { BroadcastUserLiveQuotaUseCase } from "./use-cases/BroadcastUserLiveQuotaUseCase";

export class UserQuotaController {
    static async create(req: Request, res: Response) {
        try {
            const { user_id, total_quota, next_reset_date } = req.body;
            if (!user_id || total_quota === undefined) {
                return sendResponse(res, 400, "Field user_id dan total_quota harus diisi");
            }
            const payload = { user_id, total_quota, used_quota: 0, next_reset_date };

            const useCase = new CreateUserQuotaUseCase();
            const newQuota = await useCase.execute(payload);
            return sendResponse(res, 201, "User quota berhasil dibuat", newQuota);
        } catch (error: any) {
            return sendResponse(res, 500, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async getByUserId(req: Request, res: Response) {
        try {
            const { user_id } = req.params;
            if (!user_id || isNaN(Number(user_id))) {
                return sendResponse(res, 400, "User ID harus berupa angka yang valid");
            }
            const useCase = new GetUserQuotaByUserIdUseCase();
            const quota = await useCase.execute(Number(user_id));
            return sendResponse(res, 200, "User quota berhasil diambil", quota);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async updateQuota(req: Request, res: Response) {
        try {
            const { user_id } = req.params;
            if (!user_id || isNaN(Number(user_id))) {
                return sendResponse(res, 400, "User ID harus berupa angka yang valid");
            }
            const { total_quota, used_quota, next_reset_date } = req.body;
            const payload: any = {};
            if (total_quota !== undefined) payload.total_quota = total_quota;
            if (used_quota !== undefined) payload.used_quota = used_quota;
            if (next_reset_date !== undefined) payload.next_reset_date = next_reset_date;

            if (Object.keys(payload).length === 0) {
                return sendResponse(res, 400, "Minimal satu field harus diupdate");
            }

            const useCase = new UpdateUserQuotaUseCase();
            const updatedQuota = await useCase.execute(Number(user_id), payload);
            return sendResponse(res, 200, "User quota berhasil diupdate", updatedQuota);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async incrementUsedQuota(req: Request, res: Response) {
        try {
            const { user_id } = req.params;
            const { amount } = req.body;
            if (!user_id || isNaN(Number(user_id))) {
                return sendResponse(res, 400, "User ID harus berupa angka yang valid");
            }
            if (!amount || amount < 1) {
                return sendResponse(res, 400, "Amount harus diisi dan lebih dari 0");
            }

            const useCase = new IncrementUsedQuotaUseCase();
            const updatedQuota = await useCase.execute(Number(user_id), amount);
            return sendResponse(res, 200, "Used quota berhasil ditambah", updatedQuota);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async resetQuota(req: Request, res: Response) {
        try {
            const { user_id } = req.params;
            if (!user_id || isNaN(Number(user_id))) {
                return sendResponse(res, 400, "User ID harus berupa angka yang valid");
            }

            const useCase = new ResetQuotaUseCase();
            const updatedQuota = await useCase.execute(Number(user_id));
            return sendResponse(res, 200, "Quota berhasil direset", updatedQuota);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async getCurrentUserQuotaLive(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const useCase = new BroadcastUserLiveQuotaUseCase();
            const userQuota = await useCase.execute(userId);

            return sendResponse(res, 200, "Kuota berhasil disiarkan secara live", userQuota);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }
}
