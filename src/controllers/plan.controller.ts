import { Request, Response } from "express";
import { planService } from "../services/plan.service";
import { sendResponse } from "../utils/response.util";
import { AuthRequest } from "../middleware/auth.middleware";
import {
    CreatePlanDto,
    UpdatePlanDto,
    PlanIdParamDto,
    AdjustedPriceParamDto
} from "../schemas/plan.schema";

export class PlanController {
    static async create(req: Request, res: Response) {
        try {
            const payload = req.body as CreatePlanDto;
            const newPlan = await planService.createPlan(payload);
            return sendResponse(res, 201, "Plan berhasil dibuat", newPlan);
        } catch (error: any) {
            return sendResponse(res, 500, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async getAll(req: Request, res: Response) {
        try {
            const plans = await planService.getAllPlans();
            return sendResponse(res, 200, "Daftar plan berhasil diambil", plans);
        } catch (error: any) {
            return sendResponse(res, 500, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async getById(req: Request, res: Response) {
        try {
            const { id } = req.params as unknown as PlanIdParamDto;
            const plan = await planService.getPlanById(id);
            return sendResponse(res, 200, "Plan berhasil diambil", plan);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async update(req: Request, res: Response) {
        try {
            const { id } = req.params as unknown as PlanIdParamDto;
            const payload = req.body as UpdatePlanDto;
            const updatedPlan = await planService.updatePlan(id, payload);
            return sendResponse(res, 200, "Plan berhasil diupdate", updatedPlan);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async delete(req: Request, res: Response) {
        try {
            const { id } = req.params as unknown as PlanIdParamDto;
            const result = await planService.deletePlan(id);
            return sendResponse(res, 200, result.message, null);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async getSelectedAdjustedPlanPrice(req: AuthRequest, res: Response) {
        try {
            const authenticatedUserId = req.user?.id;
            if (!authenticatedUserId) {
                return sendResponse(res, 401, "Pengguna tidak terautentikasi");
            }

            const { planId } = req.params as unknown as AdjustedPriceParamDto;
            const adjustedPriceData = await planService.calculateUpgradePrice(authenticatedUserId, planId);
            return sendResponse(res, 200, "Harga plan yang disesuaikan berhasil dihitung", adjustedPriceData);
        } catch (error: any) {
            return sendResponse(res, 500, error.message || "Terjadi kesalahan pada server");
        }
    }
}
