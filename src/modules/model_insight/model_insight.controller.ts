import {ModelInsightService} from "./model_insight.service";
import {sendResponse} from "../../utils/response";
import {Request, Response} from "express";


export class ModelInsightController {

    static async getModelInsightKPI(req: Request, res: Response) {
        try {
            const kpiData = await ModelInsightService.processModelInsightKPI();
            return sendResponse(res, 200, "KPI model insight berhasil diambil", kpiData);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async getPredictionDistribution(req: Request, res: Response) {
        try {
            const distributionData = await ModelInsightService.processPredictionDistribution();
            return sendResponse(res, 200, "Distribusi prediksi berhasil diambil", distributionData);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async getConfidenceDistribution(req: Request, res: Response) {
        try {
            const confidenceData = await ModelInsightService.processConfidenceLevelDistribution();
            return sendResponse(res, 200, "Distribusi tingkat kepercayaan berhasil diambil", confidenceData);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }


}