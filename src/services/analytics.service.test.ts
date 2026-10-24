import { AnalyticsService } from "./analytics.service";
import { AnalyticsRepository } from "../repositories/analytics.repository";
import { userRepository } from "../repositories/user.repository";
import { scanRepository } from "../repositories/scan.repository";
import { quotaService } from "./quota.service";
import { subscriptionService } from "./subscription.service";
import { getRedisClient } from "../config/redisClient";

jest.mock("../config/redisClient");
jest.mock("../repositories/user.repository");
jest.mock("../repositories/scan.repository");
jest.mock("./quota.service");
jest.mock("./subscription.service");

describe("AnalyticsService", () => {
    let analyticsService: AnalyticsService;
    let mockAnalyticsRepository: jest.Mocked<AnalyticsRepository>;

    const mockRedisClient = {
        setEx: jest.fn().mockResolvedValue("OK")
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (getRedisClient as jest.Mock).mockReturnValue(mockRedisClient);

        mockAnalyticsRepository = {
            getModelInsightMetrics: jest.fn(),
            getPredictionCounts: jest.fn(),
            getConfidenceBuckets: jest.fn(),
            getDailyScanTrend: jest.fn()
        } as unknown as jest.Mocked<AnalyticsRepository>;

        analyticsService = new AnalyticsService(mockAnalyticsRepository);
    });

    describe("getModelInsightKPI", () => {
        it("should retrieve model insight metrics from the repository for specified days", async () => {
            const expectedMetrics = {
                averageInference: 145,
                averageAccuracy: 94.2,
                totalScan: 1250,
                unConfidentScanCount: 45
            };
            mockAnalyticsRepository.getModelInsightMetrics.mockResolvedValue(expectedMetrics);

            const result = await analyticsService.getModelInsightKPI(30);

            expect(mockAnalyticsRepository.getModelInsightMetrics).toHaveBeenCalledTimes(1);
            expect(result).toEqual(expectedMetrics);
        });
    });

    describe("getPredictionDistribution", () => {
        it("should format standard categories with Normal placed first and defects sorted descending", async () => {
            mockAnalyticsRepository.getPredictionCounts.mockResolvedValue({
                normal: 500,
                crack: 120,
                scratch: 230,
                stain: 50
            });

            const result = await analyticsService.getPredictionDistribution(30);

            expect(result).toEqual([
                { prediction: "Normal", total: 500 },
                { prediction: "Scratch", total: 230 },
                { prediction: "Crack", total: 120 },
                { prediction: "Stain", total: 50 }
            ]);
        });

        it("should zero-fill standard categories that are absent in repository results", async () => {
            mockAnalyticsRepository.getPredictionCounts.mockResolvedValue({
                normal: 100
            });

            const result = await analyticsService.getPredictionDistribution(7);

            expect(result).toEqual([
                { prediction: "Normal", total: 100 },
                { prediction: "Crack", total: 0 },
                { prediction: "Scratch", total: 0 },
                { prediction: "Stain", total: 0 }
            ]);
        });
    });

    describe("getConfidenceDistribution", () => {
        it("should format all standard confidence ranges and zero-fill missing ranges", async () => {
            mockAnalyticsRepository.getConfidenceBuckets.mockResolvedValue({
                "<60%": 10,
                "80-90%": 40,
                ">95%": 150
            });

            const result = await analyticsService.getConfidenceDistribution(30);

            expect(result).toEqual([
                { confidenceRanges: "<60%", total: 10 },
                { confidenceRanges: "60-80%", total: 0 },
                { confidenceRanges: "80-90%", total: 40 },
                { confidenceRanges: "90-95%", total: 0 },
                { confidenceRanges: ">95%", total: 150 }
            ]);
        });
    });

    describe("getScanTrend", () => {
        it("should generate daily sequence for specified limit days and cache result to Redis", async () => {
            const today = new Date();
            const month = String(today.getMonth() + 1).padStart(2, "0");
            const day = String(today.getDate()).padStart(2, "0");

            mockAnalyticsRepository.getDailyScanTrend.mockResolvedValue([
                { date: `${month}-${day}`, total_scan: 25, defect_count: 5 }
            ]);

            const result = await analyticsService.getScanTrend(7, 101, "user");

            expect(result).toHaveLength(7);
            const todayEntry = result[result.length - 1];
            expect(todayEntry.total_scan).toBe(25);
            expect(todayEntry.defect_count).toBe(5);
            expect(mockRedisClient.setEx).toHaveBeenCalledWith(
                "dashboard:trend:101",
                3600,
                expect.any(String)
            );
        });

        it("should use generic cache key for admin role scan trend", async () => {
            mockAnalyticsRepository.getDailyScanTrend.mockResolvedValue([]);

            await analyticsService.getScanTrend(7, 1, "admin");

            expect(mockRedisClient.setEx).toHaveBeenCalledWith(
                "dashboard:trend",
                3600,
                expect.any(String)
            );
        });
    });

    describe("getDashboardKPI", () => {
        it("should aggregate scan and user statistics, calculate trend text, and cache to Redis", async () => {
            (userRepository.count as jest.Mock).mockResolvedValue(42);
            (scanRepository.getScanKpiStatistics as jest.Mock).mockResolvedValue({
                totalScans: 1000,
                averageScanAccuracy: 95.5,
                unNormalScanCount: 120,
                totalScansThisMonth: 300,
                totalScansLastMonth: 200,
                defectCountThisMonth: 30,
                activeUsersThisMonth: 15
            });

            (quotaService.getUserQuotaDetails as jest.Mock).mockResolvedValue({
                total_quota: 100,
                used_quota: 20,
                remaining_quota: 80,
                is_quota_low: false,
                next_reset_date: new Date("2026-11-01")
            });

            (subscriptionService.getActiveSubscriptionByUserId as jest.Mock).mockResolvedValue({
                status: "active",
                end_date: new Date("2026-12-31"),
                plan: { name: "Pro Plan" }
            });

            const result = await analyticsService.getDashboardKPI(101, "user");

            expect(result.total_users).toBe(42);
            expect(result.total_scans_this_month).toBe(300);
            expect(result.scan_change_text).toBe("Naik 50% dari bulan lalu");
            expect(result.defect_rate).toBe(10);
            expect(result.user_quota).toEqual({
                total_quota: 100,
                used_quota: 20,
                remaining_quota: 80,
                is_quota_low: false,
                next_reset_date: expect.any(Date)
            });
            expect(result.active_subscription).toEqual({
                plan_name: "Pro Plan",
                status: "active",
                end_date: expect.any(Date)
            });
            expect(mockRedisClient.setEx).toHaveBeenCalledWith(
                "dashboard:kpi:101",
                300,
                expect.any(String)
            );
        });

        it("should handle zero scans last month gracefully in trend calculation", async () => {
            (userRepository.count as jest.Mock).mockResolvedValue(10);
            (scanRepository.getScanKpiStatistics as jest.Mock).mockResolvedValue({
                totalScans: 50,
                averageScanAccuracy: 90,
                unNormalScanCount: 5,
                totalScansThisMonth: 50,
                totalScansLastMonth: 0,
                defectCountThisMonth: 5,
                activeUsersThisMonth: 3
            });

            const result = await analyticsService.getDashboardKPI(undefined, "admin");

            expect(result.scan_change_text).toBe("Naik 100% dari bulan lalu");
            expect(result.user_quota).toBeNull();
            expect(result.active_subscription).toBeNull();
        });
    });
});
