import { GetAdminDashboardKpiQueryHandler } from "./queries/GetAdminDashboardKpiQuery";
import { GetUserDashboardKpiQueryHandler } from "./queries/GetUserDashboardKpiQuery";
import { GetScanTrendQueryHandler, ScanTrendItemDto } from "./queries/GetScanTrendQuery";
import { DashboardKpiResponseDto } from "./queries/dashboardKpi.types";

export class DashboardService {
    private static adminKpiHandler = new GetAdminDashboardKpiQueryHandler();
    private static userKpiHandler = new GetUserDashboardKpiQueryHandler();
    private static scanTrendHandler = new GetScanTrendQueryHandler();

    static async getDashboardKPI(userId?: number, userRole?: string): Promise<DashboardKpiResponseDto> {
        if (userRole === "admin") {
            return await this.adminKpiHandler.execute();
        }

        if (userId) {
            return await this.userKpiHandler.execute(userId);
        }

        // Fallback jika tidak ada userId
        return await this.adminKpiHandler.execute();
    }

    static async getScanTrend(
        limitDays: number = 7,
        userId?: number,
        userRole?: string
    ): Promise<ScanTrendItemDto[]> {
        return await this.scanTrendHandler.execute(limitDays, userId, userRole);
    }
}
