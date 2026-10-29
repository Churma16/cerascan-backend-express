import { GetScanTrendQueryHandler } from "./GetScanTrendQuery";
import { AnalyticsRepository } from "../../../repositories/analytics.repository";
import { getRedisClient } from "../../../config/redisClient";

jest.mock("../../../config/redisClient");

describe("GetScanTrendQueryHandler", () => {
    let handler: GetScanTrendQueryHandler;
    let mockAnalyticsRepository: jest.Mocked<AnalyticsRepository>;

    const mockRedisClient = {
        setEx: jest.fn().mockResolvedValue("OK")
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (getRedisClient as jest.Mock).mockReturnValue(mockRedisClient);

        mockAnalyticsRepository = {
            getDailyScanTrend: jest.fn()
        } as unknown as jest.Mocked<AnalyticsRepository>;

        handler = new GetScanTrendQueryHandler(mockAnalyticsRepository);
    });

    it("should generate daily sequence for limit days and cache to Redis", async () => {
        mockAnalyticsRepository.getDailyScanTrend.mockResolvedValue([]);

        const result = await handler.execute(7, 42, "user");

        expect(result).toHaveLength(7);
        expect(mockAnalyticsRepository.getDailyScanTrend).toHaveBeenCalledWith(
            expect.any(Date),
            42
        );
        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
            "dashboard:trend:42",
            3600,
            JSON.stringify(result)
        );
    });

    it("should use generic cache key for admin role", async () => {
        mockAnalyticsRepository.getDailyScanTrend.mockResolvedValue([]);

        const result = await handler.execute(7, 42, "admin");

        expect(result).toHaveLength(7);
        expect(mockAnalyticsRepository.getDailyScanTrend).toHaveBeenCalledWith(
            expect.any(Date),
            undefined
        );
        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
            "dashboard:trend",
            3600,
            JSON.stringify(result)
        );
    });
});
