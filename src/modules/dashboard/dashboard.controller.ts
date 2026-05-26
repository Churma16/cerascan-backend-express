import {Request, Response} from "express";
import {sendResponse, sendResponseMulti} from "../../utils/response";
import {DashboardService} from "./dashboard.service";
import {ScanService} from "../scan/scan.service";
import {getRedisClient} from "../../config/redis_client";

export class DashboardController {
    static async getDashboardKpi(req: Request, res: Response) {
        try {
            const kpiData = await DashboardService.getDashboardKPI();
            const response = {
                total_scans: kpiData.totalScans,
                total_users: kpiData.totalUsers,
                average_scan_accuracy: kpiData.averageScanAccuracy,
                unnormal_scan_count: kpiData.unNormalScanCount
            };

            await getRedisClient().setEx('dashboard:kpi', 300, JSON.stringify(response));

            return sendResponse(res, 200, "KPI dashboard berhasil diambil", response);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async getLatestScanData(req: Request, res: Response) {
        try {
            const scanData = await ScanService.getHistory(5);
            return sendResponseMulti(res, 200, "Data scan terbaru berhasil diambil", scanData);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async getLatestScanDataTrend(req: Request, res: Response) {
        try {
            const result = await ScanService.get7DaysScanDataCount();

            await getRedisClient().setEx('dashboard:trend', 3600, JSON.stringify(result));

            return sendResponseMulti(res, 200, 'Trend scan berhasil diambil', result);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }
}