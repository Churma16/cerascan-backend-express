import { GetAdminDashboardKpiQueryHandler } from "./GetAdminDashboardKpiQuery";
import { UserRepository } from "../../../repositories/user.repository";
import { ScanRepository } from "../../../repositories/scan.repository";
import { getRedisClient } from "../../../config/redisClient";

jest.mock("../../../config/redisClient");

describe("GetAdminDashboardKpiQueryHandler", () => {
    let handler: GetAdminDashboardKpiQueryHandler;
    let mockUserRepository: jest.Mocked<UserRepository>;
    let mockScanRepository: jest.Mocked<ScanRepository>;

    const mockRedisClient = {
        setEx: jest.fn().mockResolvedValue("OK")
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (getRedisClient as jest.Mock).mockReturnValue(mockRedisClient);

        mockUserRepository = {
            count: jest.fn()
        } as unknown as jest.Mocked<UserRepository>;

        mockScanRepository = {
            getScanKpiStatistics: jest.fn()
        } as unknown as jest.Mocked<ScanRepository>;

        handler = new GetAdminDashboardKpiQueryHandler(mockUserRepository, mockScanRepository);
    });

    it("should aggregate admin metrics correctly and save cache to Redis", async () => {
        mockUserRepository.count.mockResolvedValue(120);
        mockScanRepository.getScanKpiStatistics.mockResolvedValue({
            totalScans: 5000,
            averageScanAccuracy: 95.5,
            unNormalScanCount: 450,
            totalScansThisMonth: 800,
            totalScansLastMonth: 400,
            defectCountThisMonth: 80,
            activeUsersThisMonth: 65
        });

        const result = await handler.execute();

        expect(mockUserRepository.count).toHaveBeenCalledTimes(1);
        expect(mockScanRepository.getScanKpiStatistics).toHaveBeenCalledWith(
            undefined,
            expect.any(Date),
            expect.any(Date),
            expect.any(Date)
        );

        expect(result).toEqual({
            total_scans: 5000,
            total_users: 120,
            average_scan_accuracy: 95.5,
            unnormal_scan_count: 450,
            total_scans_this_month: 800,
            scan_change_text: "Naik 100% dari bulan lalu",
            defect_rate: 10.0,
            defect_count_this_month: 80,
            active_users_this_month: 65,
            user_quota: null,
            active_subscription: null
        });

        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
            "dashboard:kpi:admin",
            300,
            JSON.stringify(result)
        );
    });

    it("should handle zero scans last month gracefully in trend calculation", async () => {
        mockUserRepository.count.mockResolvedValue(10);
        mockScanRepository.getScanKpiStatistics.mockResolvedValue({
            totalScans: 100,
            averageScanAccuracy: 90,
            unNormalScanCount: 10,
            totalScansThisMonth: 100,
            totalScansLastMonth: 0,
            defectCountThisMonth: 5,
            activeUsersThisMonth: 10
        });

        const result = await handler.execute();

        expect(result.scan_change_text).toBe("Naik 100% dari bulan lalu");
        expect(result.defect_rate).toBe(5.0);
    });
});
