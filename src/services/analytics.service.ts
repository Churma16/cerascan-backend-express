import { ModelInsightMetrics } from "../repositories/analytics.repository";
import { GetModelInsightKpiQueryHandler } from "../modules/model-insight/queries/GetModelInsightKpiQuery";
import { GetScanTrendQueryHandler, ScanTrendItemDto } from "../modules/dashboard/queries/GetScanTrendQuery";
import { GetAdminDashboardKpiQueryHandler } from "../modules/dashboard/queries/GetAdminDashboardKpiQuery";
import { GetUserDashboardKpiQueryHandler } from "../modules/dashboard/queries/GetUserDashboardKpiQuery";
import { DashboardKpiResponseDto } from "../modules/dashboard/queries/dashboardKpi.types";

export class AnalyticsService {
    private modelInsightHandler: GetModelInsightKpiQueryHandler;
    private scanTrendHandler: GetScanTrendQueryHandler;
    private adminKpiHandler: GetAdminDashboardKpiQueryHandler;
    private userKpiHandler: GetUserDashboardKpiQueryHandler;

    constructor() {
        this.modelInsightHandler = new GetModelInsightKpiQueryHandler();
        this.scanTrendHandler = new GetScanTrendQueryHandler();
        this.adminKpiHandler = new GetAdminDashboardKpiQueryHandler();
        this.userKpiHandler = new GetUserDashboardKpiQueryHandler();
    }

    async getModelInsightKPI(days: number = 30): Promise<ModelInsightMetrics> {
        return await this.modelInsightHandler.getModelInsightMetrics(days);
    }

    async getPredictionDistribution(days: number = 30): Promise<Array<{ prediction: string; total: number }>> {
        return await this.modelInsightHandler.getPredictionDistribution(days);
    }

    async getConfidenceDistribution(days: number = 30): Promise<Array<{ confidenceRanges: string; total: number }>> {
        return await this.modelInsightHandler.getConfidenceDistribution(days);
    }

    async getScanTrend(
        limitDays: number = 7,
        userId?: number,
        userRole?: string
    ): Promise<ScanTrendItemDto[]> {
        return await this.scanTrendHandler.execute(limitDays, userId, userRole);
    }

    async getDashboardKPI(userId?: number, userRole?: string): Promise<DashboardKpiResponseDto> {
        if (userRole === "admin") {
            return await this.adminKpiHandler.execute();
        }
        if (userId) {
            return await this.userKpiHandler.execute(userId);
        }
        return await this.adminKpiHandler.execute();
    }
}

export const analyticsService = new AnalyticsService();
