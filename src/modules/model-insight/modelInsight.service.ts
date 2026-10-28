import { analyticsService } from "../../services/analytics.service";

export class ModelInsightService {
    static async getModelInsightKPI(days: number = 30) {
        return await analyticsService.getModelInsightKPI(days);
    }

    static async getPredictionDistribution(days: number = 30) {
        return await analyticsService.getPredictionDistribution(days);
    }

    static async getConfidenceDistribution(days: number = 30) {
        return await analyticsService.getConfidenceDistribution(days);
    }
}
