import { GetModelInsightKpiQueryHandler } from "./queries/GetModelInsightKpiQuery";

export class ModelInsightService {
    private static modelInsightHandler = new GetModelInsightKpiQueryHandler();

    static async getModelInsightKPI(days: number = 30) {
        return await this.modelInsightHandler.getModelInsightMetrics(days);
    }

    static async getPredictionDistribution(days: number = 30) {
        return await this.modelInsightHandler.getPredictionDistribution(days);
    }

    static async getConfidenceDistribution(days: number = 30) {
        return await this.modelInsightHandler.getConfidenceDistribution(days);
    }
}
