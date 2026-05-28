import {Request, Response} from "express";
import {sendResponse} from "../../utils/response";
import {PlanService} from "./plan.service";

export class PlanController {

    static async create(req: Request, res: Response) {
        try {
            const {name, price, scan_quota, duration_days} = req.body;
            if (!name || price === undefined || scan_quota === undefined || duration_days === undefined) {
                return sendResponse(res, 400, "Semua field (name, price, scan_quota, duration_days) harus diisi");
            }
            const payload = {name, price, scan_quota, duration_days};

            const newPlan = await PlanService.createPlan(payload);
            return sendResponse(res, 201, "Plan berhasil dibuat", newPlan);
        } catch (error: any) {
            return sendResponse(res, 500, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async getAll(req: Request, res: Response) {
        try {
            const plans = await PlanService.getAllPlans();
            return sendResponse(res, 200, "Daftar plan berhasil diambil", plans);
        } catch (error: any) {
            return sendResponse(res, 500, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async getById(req: Request, res: Response) {
        try {
            const {id} = req.params;
            if (!id || isNaN(Number(id))) {
                return sendResponse(res, 400, "ID plan harus berupa angka yang valid");
            }
            const plan = await PlanService.getPlanById(Number(id));
            return sendResponse(res, 200, "Plan berhasil diambil", plan);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async update(req: Request, res: Response) {
        try {
            const {id} = req.params;
            if (!id || isNaN(Number(id))) {
                return sendResponse(res, 400, "ID plan harus berupa angka yang valid");
            }
            const {name, price, scan_quota, duration_days} = req.body;
            const payload: any = {};
            if (name !== undefined) payload.name = name;
            if (price !== undefined) payload.price = price;
            if (scan_quota !== undefined) payload.scan_quota = scan_quota;
            if (duration_days !== undefined) payload.duration_days = duration_days;

            if (Object.keys(payload).length === 0) {
                return sendResponse(res, 400, "Minimal satu field harus diupdate");
            }

            const updatedPlan = await PlanService.updatePlan(Number(id), payload);
            return sendResponse(res, 200, "Plan berhasil diupdate", updatedPlan);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async delete(req: Request, res: Response) {
        try {
            const {id} = req.params;
            if (!id || isNaN(Number(id))) {
                return sendResponse(res, 400, "ID plan harus berupa angka yang valid");
            }
            const result = await PlanService.deletePlan(Number(id));
            return sendResponse(res, 200, result.message, null);
        } catch (error: any) {
            return sendResponse(res, 404, error.message || "Terjadi kesalahan pada server");
        }
    }
}