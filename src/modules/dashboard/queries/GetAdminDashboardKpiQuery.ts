import dayjs from "dayjs";
import { getNowIndonesiaTime } from "../../../utils/time.util";
import { userRepository, UserRepository } from "../../../repositories/user.repository";
import { scanRepository, ScanRepository } from "../../../repositories/scan.repository";
import { getRedisClient } from "../../../config/redisClient";
import {
    calculateTrendPercentageText,
    DashboardKpiResponseDto
} from "./dashboardKpi.types";

export class GetAdminDashboardKpiQueryHandler {
    constructor(
        private readonly userRepo: UserRepository = userRepository,
        private readonly scanRepo: ScanRepository = scanRepository
    ) {}

    async execute(): Promise<DashboardKpiResponseDto> {
        const startOfCurrentMonth = dayjs(getNowIndonesiaTime()).startOf("month").toDate();
        const startOfLastMonth = dayjs(getNowIndonesiaTime()).subtract(1, "month").startOf("month").toDate();
        const endOfLastMonth = dayjs(getNowIndonesiaTime()).subtract(1, "month").endOf("month").toDate();

        const [totalPlatformUsers, platformScanStats] = await Promise.all([
            this.userRepo.count(),
            this.scanRepo.getScanKpiStatistics(
                undefined,
                startOfCurrentMonth,
                startOfLastMonth,
                endOfLastMonth
            )
        ]);

        const totalScansThisMonth = platformScanStats.totalScansThisMonth;
        const totalScansLastMonth = platformScanStats.totalScansLastMonth;
        const defectCountThisMonth = platformScanStats.defectCountThisMonth;
        const scanChangeText = calculateTrendPercentageText(totalScansLastMonth, totalScansThisMonth);

        const defectRate = totalScansThisMonth > 0
            ? Number(((defectCountThisMonth / totalScansThisMonth) * 100).toFixed(1))
            : 0;

        const responsePayload: DashboardKpiResponseDto = {
            total_scans: platformScanStats.totalScans,
            total_users: totalPlatformUsers,
            average_scan_accuracy: Number(platformScanStats.averageScanAccuracy) || 0,
            unnormal_scan_count: platformScanStats.unNormalScanCount,
            total_scans_this_month: totalScansThisMonth,
            scan_change_text: scanChangeText,
            defect_rate: defectRate,
            defect_count_this_month: defectCountThisMonth,
            active_users_this_month: platformScanStats.activeUsersThisMonth,
            user_quota: null,
            active_subscription: null
        };

        const redisCacheKey = "dashboard:kpi:admin";
        try {
            await getRedisClient().setEx(redisCacheKey, 300, JSON.stringify(responsePayload));
        } catch (cacheError) {
            console.error("[GetAdminDashboardKpiQueryHandler] Redis Cache Save Error:", cacheError);
        }

        return responsePayload;
    }
}
