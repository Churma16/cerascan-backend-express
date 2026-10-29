import { Request, Response } from "express";
import { sendResponse, sendResponseMulti } from "../../utils/response.util";
import { scanService } from "../../services/scan.service";
import { AuthRequest } from "../../middleware/auth.middleware";
import { DashboardService } from "./dashboard.service";

export class DashboardController {
    static async getDashboardKpi(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const userRole = req.user?.role;
            const dashboardKpiData = await DashboardService.getDashboardKPI(userId, userRole);
            return sendResponse(res, 200, "KPI dashboard berhasil diambil", dashboardKpiData);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async getLatestScanData(req: Request, res: Response) {
        try {
            const scanData = await scanService.getScanHistory({ limit: 5 });
            return sendResponseMulti(res, 200, "Data scan terbaru berhasil diambil", scanData as any[]);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async getLatestScanDataTrend(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const userRole = req.user?.role;
            const scanTrends = await DashboardService.getScanTrend(7, userId, userRole);
            return sendResponseMulti(res, 200, "Trend scan berhasil diambil", scanTrends);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }
}
