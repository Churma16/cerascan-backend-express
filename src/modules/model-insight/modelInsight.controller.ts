import { Request, Response } from "express";
import { sendResponse } from "../../utils/response.util";
import { ModelInsightService } from "./modelInsight.service";

export class ModelInsightController {
    static async getModelInsightKPI(req: Request, res: Response) {
        try {
            const kpiData = await ModelInsightService.getModelInsightKPI();
            return sendResponse(res, 200, "KPI model insight berhasil diambil", kpiData);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async getPredictionDistribution(req: Request, res: Response) {
        try {
            const finalDistribution = await ModelInsightService.getPredictionDistribution();
            return sendResponse(res, 200, "Distribusi prediksi berhasil diambil", finalDistribution);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async getConfidenceDistribution(req: Request, res: Response) {
        try {
            const confidenceDistribution = await ModelInsightService.getConfidenceDistribution();
            return sendResponse(res, 200, "Distribusi tingkat kepercayaan berhasil diambil", confidenceDistribution);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }
}
