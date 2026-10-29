import { GetUserDashboardKpiQueryHandler } from "./GetUserDashboardKpiQuery";
import { ScanRepository } from "../../../repositories/scan.repository";
import { QuotaService } from "../../../services/quota.service";
import { SubscriptionService } from "../../../services/subscription.service";
import { getRedisClient } from "../../../config/redisClient";

jest.mock("../../../config/redisClient");

describe("GetUserDashboardKpiQueryHandler", () => {
    let handler: GetUserDashboardKpiQueryHandler;
    let mockScanRepository: jest.Mocked<ScanRepository>;
    let mockQuotaService: jest.Mocked<QuotaService>;
    let mockSubscriptionService: jest.Mocked<SubscriptionService>;

    const mockRedisClient = {
        setEx: jest.fn().mockResolvedValue("OK")
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (getRedisClient as jest.Mock).mockReturnValue(mockRedisClient);

        mockScanRepository = {
            getScanKpiStatistics: jest.fn()
        } as unknown as jest.Mocked<ScanRepository>;

        mockQuotaService = {
            getUserQuotaDetails: jest.fn()
        } as unknown as jest.Mocked<QuotaService>;

        mockSubscriptionService = {
            getActiveSubscriptionByUserId: jest.fn()
        } as unknown as jest.Mocked<SubscriptionService>;

        handler = new GetUserDashboardKpiQueryHandler(
            mockScanRepository,
            mockQuotaService,
            mockSubscriptionService
        );
    });

    it("should fetch user metrics, quota, and subscription, and cache to Redis", async () => {
        const userId = 42;
        mockScanRepository.getScanKpiStatistics.mockResolvedValue({
            totalScans: 50,
            averageScanAccuracy: 98.2,
            unNormalScanCount: 4,
            totalScansThisMonth: 30,
            totalScansLastMonth: 20,
            defectCountThisMonth: 3,
            activeUsersThisMonth: 1
        });

        mockQuotaService.getUserQuotaDetails.mockResolvedValue({
            total_quota: 100,
            used_quota: 30,
            remaining_quota: 70,
            is_quota_low: false,
            next_reset_date: "2026-11-01"
        } as any);

        mockSubscriptionService.getActiveSubscriptionByUserId.mockResolvedValue({
            status: "active",
            end_date: "2026-12-31",
            plan: { name: "Pro Monthly" }
        } as any);

        const result = await handler.execute(userId);

        expect(mockScanRepository.getScanKpiStatistics).toHaveBeenCalledWith(
            userId,
            expect.any(Date),
            expect.any(Date),
            expect.any(Date)
        );
        expect(mockQuotaService.getUserQuotaDetails).toHaveBeenCalledWith(userId);
        expect(mockSubscriptionService.getActiveSubscriptionByUserId).toHaveBeenCalledWith(userId);

        expect(result).toEqual({
            total_scans: 50,
            total_users: 1,
            average_scan_accuracy: 98.2,
            unnormal_scan_count: 4,
            total_scans_this_month: 30,
            scan_change_text: "Naik 50% dari bulan lalu",
            defect_rate: 10.0,
            defect_count_this_month: 3,
            active_users_this_month: 1,
            user_quota: {
                total_quota: 100,
                used_quota: 30,
                remaining_quota: 70,
                is_quota_low: false,
                next_reset_date: "2026-11-01"
            },
            active_subscription: {
                plan_name: "Pro Monthly",
                status: "active",
                end_date: "2026-12-31"
            }
        });

        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
            `dashboard:kpi:${userId}`,
            300,
            JSON.stringify(result)
        );
    });

    it("should handle error in quota and subscription gracefully without throwing", async () => {
        const userId = 42;
        mockScanRepository.getScanKpiStatistics.mockResolvedValue({
            totalScans: 10,
            averageScanAccuracy: 95,
            unNormalScanCount: 1,
            totalScansThisMonth: 10,
            totalScansLastMonth: 10,
            defectCountThisMonth: 1,
            activeUsersThisMonth: 1
        });

        mockQuotaService.getUserQuotaDetails.mockRejectedValue(new Error("Quota Service Down"));
        mockSubscriptionService.getActiveSubscriptionByUserId.mockRejectedValue(new Error("Sub Service Down"));

        const result = await handler.execute(userId);

        expect(result.user_quota).toBeNull();
        expect(result.active_subscription).toBeNull();
        expect(result.scan_change_text).toBe("Stabil dari bulan lalu");
    });
});
