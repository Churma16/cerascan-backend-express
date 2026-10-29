import { GetModelInsightKpiQueryHandler } from "./GetModelInsightKpiQuery";
import { AnalyticsRepository } from "../../../repositories/analytics.repository";

describe("GetModelInsightKpiQueryHandler", () => {
    let handler: GetModelInsightKpiQueryHandler;
    let mockAnalyticsRepository: jest.Mocked<AnalyticsRepository>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockAnalyticsRepository = {
            getModelInsightMetrics: jest.fn(),
            getPredictionCounts: jest.fn(),
            getConfidenceBuckets: jest.fn()
        } as unknown as jest.Mocked<AnalyticsRepository>;

        handler = new GetModelInsightKpiQueryHandler(mockAnalyticsRepository);
    });

    it("should retrieve model insight metrics from the repository for specified days", async () => {
        const expectedMetrics = {
            averageInference: 145,
            averageAccuracy: 94.2,
            totalScan: 1250,
            unConfidentScanCount: 45
        };
        mockAnalyticsRepository.getModelInsightMetrics.mockResolvedValue(expectedMetrics);

        const result = await handler.getModelInsightMetrics(30);

        expect(mockAnalyticsRepository.getModelInsightMetrics).toHaveBeenCalledTimes(1);
        expect(result).toEqual(expectedMetrics);
    });

    it("should format standard categories with Normal placed first and defects sorted descending", async () => {
        mockAnalyticsRepository.getPredictionCounts.mockResolvedValue({
            normal: 500,
            crack: 120,
            scratch: 230,
            stain: 50
        });

        const result = await handler.getPredictionDistribution(30);

        expect(result).toEqual([
            { prediction: "Normal", total: 500 },
            { prediction: "Scratch", total: 230 },
            { prediction: "Crack", total: 120 },
            { prediction: "Stain", total: 50 }
        ]);
    });

    it("should format all standard confidence ranges and zero-fill missing ranges", async () => {
        mockAnalyticsRepository.getConfidenceBuckets.mockResolvedValue({
            "<60%": 12,
            ">95%": 450
        });

        const result = await handler.getConfidenceDistribution(30);

        expect(result).toEqual([
            { confidenceRanges: "<60%", total: 12 },
            { confidenceRanges: "60-80%", total: 0 },
            { confidenceRanges: "80-90%", total: 0 },
            { confidenceRanges: "90-95%", total: 0 },
            { confidenceRanges: ">95%", total: 450 }
        ]);
    });
});
