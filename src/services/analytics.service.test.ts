import { analyticsService } from "./analytics.service";

describe("AnalyticsService Facade", () => {
    it("should be defined and expose all standard analytics query methods", () => {
        expect(analyticsService).toBeDefined();
        expect(typeof analyticsService.getModelInsightKPI).toBe("function");
        expect(typeof analyticsService.getPredictionDistribution).toBe("function");
        expect(typeof analyticsService.getConfidenceDistribution).toBe("function");
        expect(typeof analyticsService.getScanTrend).toBe("function");
        expect(typeof analyticsService.getDashboardKPI).toBe("function");
    });
});
