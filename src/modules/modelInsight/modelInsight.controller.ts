import { Request, Response } from "express";
import { sendResponse } from "../../utils/response";

import { GetModelInsightKPIUseCase } from "./use-cases/GetModelInsightKPIUseCase";
import { GetPredictionDistributionUseCase } from "./use-cases/GetPredictionDistributionUseCase";
import { GetConfidenceDistributionUseCase } from "./use-cases/GetConfidenceDistributionUseCase";

export class ModelInsightController {
    static async getModelInsightKPI(req: Request, res: Response) {
        try {
            const useCase = new GetModelInsightKPIUseCase();
            const kpiData = await useCase.execute();
            return sendResponse(res, 200, "KPI model insight berhasil diambil", kpiData);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async getPredictionDistribution(req: Request, res: Response) {
        try {
            const useCase = new GetPredictionDistributionUseCase();
            const distributionData = await useCase.execute();
            return sendResponse(res, 200, "Distribusi prediksi berhasil diambil", distributionData);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async getConfidenceDistribution(req: Request, res: Response) {
        try {
            const useCase = new GetConfidenceDistributionUseCase();
            const confidenceData = await useCase.execute();
            return sendResponse(res, 200, "Distribusi tingkat kepercayaan berhasil diambil", confidenceData);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }
}