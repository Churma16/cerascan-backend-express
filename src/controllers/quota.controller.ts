import { Request, Response } from "express";
import { quotaService } from "../services/quota.service";
import { sendResponse } from "../utils/response.util";
import {
    CreateQuotaDto,
    UpdateQuotaDto,
    IncrementQuotaDto,
    UserIdParamDto
} from "../schemas/quota.schema";

export class QuotaController {
    static async create(req: Request, res: Response) {
        try {
            const { user_id, total_quota, next_reset_date } = req.body as CreateQuotaDto;
            const payload = { user_id, total_quota, used_quota: 0, next_reset_date };
            const newQuota = await quotaService.createQuota(payload);
            return sendResponse(res, 201, "User quota berhasil dibuat", newQuota);
        } catch (error: any) {
            return sendResponse(res, 500, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async getByUserId(req: Request, res: Response) {
        try {
            const { user_id } = req.params as unknown as UserIdParamDto;
            const quota = await quotaService.getQuotaByUserId(user_id);
            return sendResponse(res, 200, "User quota berhasil diambil", quota);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async updateQuota(req: Request, res: Response) {
        try {
            const { user_id } = req.params as unknown as UserIdParamDto;
            const payload = req.body as UpdateQuotaDto;

            const updatedQuota = await quotaService.updateQuota(user_id, payload);
            return sendResponse(res, 200, "User quota berhasil diupdate", updatedQuota);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async incrementUsedQuota(req: Request, res: Response) {
        try {
            const { user_id } = req.params as unknown as UserIdParamDto;
            const { amount } = req.body as IncrementQuotaDto;

            const updatedQuota = await quotaService.incrementUsedQuota(user_id, amount);
            return sendResponse(res, 200, "Used quota berhasil ditambah", updatedQuota);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async resetQuota(req: Request, res: Response) {
        try {
            const { user_id } = req.params as unknown as UserIdParamDto;
            const updatedQuota = await quotaService.resetQuota(user_id);
            return sendResponse(res, 200, "Quota berhasil direset", updatedQuota);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }
}
