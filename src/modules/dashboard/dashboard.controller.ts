import {Request, Response} from "express";
import {sendResponse, sendResponseMulti} from "../../utils/response";
import {DashboardService} from "./dashboard.service";
import {ScanService} from "../scan/scan.service";


export class DashboardController {
    static async getDashboardKpi(req: Request, res: Response) {
        try {
            const kpiData = await DashboardService.getDashboardKPI();
            const response = {
                total_scans: kpiData.totalScans,
                total_users: kpiData.totalUsers,
                average_scan_accuracy: kpiData.averageScanAccuracy,
                unnormal_scan_count: kpiData.unNormalScanCount
            }
            return sendResponse(res, 200, "KPI dashboard berhasil diambil", response);
        } catch (error: any) {
            return sendResponse(res, 500, error);
        }
    }

    static async getLatestScanData(req: Request, res: Response) {
        try {
            const scanData = await ScanService.getHistory(5);
            return sendResponseMulti(res, 200, "Data scan terbaru berhasil diambil", scanData);
        } catch (error: any) {
            return sendResponse(res, 500, error);
        }
    }
}