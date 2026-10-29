import dayjs from "dayjs";
import { getNowIndonesiaTime } from "../../../utils/time.util";
import { analyticsRepository, AnalyticsRepository, ModelInsightMetrics } from "../../../repositories/analytics.repository";

export interface PredictionDistributionItemDto {
    prediction: string;
    total: number;
}

export interface ConfidenceDistributionItemDto {
    confidenceRanges: string;
    total: number;
}

export class GetModelInsightKpiQueryHandler {
    constructor(
        private readonly analyticsRepo: AnalyticsRepository = analyticsRepository
    ) {}

    async getModelInsightMetrics(days: number = 30): Promise<ModelInsightMetrics> {
        const sinceDate = dayjs(getNowIndonesiaTime()).subtract(days, "day").toDate();
        return await this.analyticsRepo.getModelInsightMetrics(sinceDate);
    }

    async getPredictionDistribution(days: number = 30): Promise<PredictionDistributionItemDto[]> {
        const sinceDate = dayjs(getNowIndonesiaTime()).subtract(days, "day").toDate();
        const counts = await this.analyticsRepo.getPredictionCounts(sinceDate);

        const standardCategories = ["Normal", "Crack", "Scratch", "Stain"];
        const distributions = standardCategories.map(category => ({
            prediction: category,
            total: counts[category.toLowerCase()] || 0
        }));

        const normalItem = distributions.find(item => item.prediction === "Normal");
        const defectItems = distributions
            .filter(item => item.prediction !== "Normal")
            .sort((a, b) => b.total - a.total);

        return normalItem ? [normalItem, ...defectItems] : defectItems;
    }

    async getConfidenceDistribution(days: number = 30): Promise<ConfidenceDistributionItemDto[]> {
        const sinceDate = dayjs(getNowIndonesiaTime()).subtract(days, "day").toDate();
        const bucketCounts = await this.analyticsRepo.getConfidenceBuckets(sinceDate);

        const standardRanges = ["<60%", "60-80%", "80-90%", "90-95%", ">95%"];
        return standardRanges.map(range => ({
            confidenceRanges: range,
            total: bucketCounts[range] || 0
        }));
    }
}
