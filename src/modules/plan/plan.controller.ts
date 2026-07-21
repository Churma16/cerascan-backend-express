import { Request, Response } from "express";
import { sendResponse } from "../../utils/response";
import { AuthRequest } from '../../middleware/auth.middleware';

import { CreatePlanUseCase } from "./use-cases/CreatePlanUseCase";
import { GetAllPlansUseCase } from "./use-cases/GetAllPlansUseCase";
import { GetPlanByIdUseCase } from "./use-cases/GetPlanByIdUseCase";
import { UpdatePlanUseCase } from "./use-cases/UpdatePlanUseCase";
import { DeletePlanUseCase } from "./use-cases/DeletePlanUseCase";
import { CalculateUpgradePriceUseCase } from "./use-cases/CalculateUpgradePriceUseCase";

export class PlanController {
    static async create(req: Request, res: Response) {
        try {
            const { name, price, scan_quota, duration_days } = req.body;
            if (!name || price === undefined || scan_quota === undefined || duration_days === undefined) {
                return sendResponse(res, 400, "Semua field (name, price, scan_quota, duration_days) harus diisi");
            }
            const payload = { name, price, scan_quota, duration_days };

            const useCase = new CreatePlanUseCase();
            const newPlan = await useCase.execute(payload);
            return sendResponse(res, 201, "Plan berhasil dibuat", newPlan);
        } catch (error: any) {
            return sendResponse(res, 500, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async getAll(req: Request, res: Response) {
        try {
            const useCase = new GetAllPlansUseCase();
            const plans = await useCase.execute();
            return sendResponse(res, 200, "Daftar plan berhasil diambil", plans);
        } catch (error: any) {
            return sendResponse(res, 500, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async getById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            if (!id || isNaN(Number(id))) {
                return sendResponse(res, 400, "ID plan harus berupa angka yang valid");
            }
            const useCase = new GetPlanByIdUseCase();
            const plan = await useCase.execute(Number(id));
            return sendResponse(res, 200, "Plan berhasil diambil", plan);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            if (!id || isNaN(Number(id))) {
                return sendResponse(res, 400, "ID plan harus berupa angka yang valid");
            }
            const { name, price, scan_quota, duration_days } = req.body;
            const payload: any = {};
            if (name !== undefined) payload.name = name;
            if (price !== undefined) payload.price = price;
            if (scan_quota !== undefined) payload.scan_quota = scan_quota;
            if (duration_days !== undefined) payload.duration_days = duration_days;

            if (Object.keys(payload).length === 0) {
                return sendResponse(res, 400, "Minimal satu field harus diupdate");
            }

            const useCase = new UpdatePlanUseCase();
            const updatedPlan = await useCase.execute(Number(id), payload);
            return sendResponse(res, 200, "Plan berhasil diupdate", updatedPlan);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            if (!id || isNaN(Number(id))) {
                return sendResponse(res, 400, "ID plan harus berupa angka yang valid");
            }
            const useCase = new DeletePlanUseCase();
            const result = await useCase.execute(Number(id));
            return sendResponse(res, 200, result.message, null);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async getSelectedAdjustedPlanPrice(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.id;
            if (!userId || isNaN(Number(userId))) {
                return sendResponse(res, 400, "ID User plan harus berupa angka yang valid");
            }

            const { planId } = req.params;
            if (!planId || isNaN(Number(planId))) {
                return sendResponse(res, 400, "ID Plan harus berupa angka yang valid");
            }

            const useCase = new CalculateUpgradePriceUseCase();
            const adjustedPriceData = await useCase.execute(Number(userId), Number(planId));
            return sendResponse(res, 200, "Harga plan yang disesuaikan berhasil dihitung", adjustedPriceData);
        } catch (error: any) {
            return sendResponse(res, 500, error.message || "Terjadi kesalahan pada server");
        }
    }
}