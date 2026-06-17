import {Request, Response} from "express";
import {sendResponse, sendResponseMulti} from "../../utils/response";
import {DashboardService} from "./dashboard.service";
import {ScanService} from "../scan/scan.service";
import {getRedisClient} from "../../config/redis_client";
import {AuthRequest} from "../../middleware/auth.guard";

export class DashboardController {
    static async getDashboardKpi(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const userRole = req.user?.role;
            const kpiData = await DashboardService.getDashboardKPI(userId, userRole);

            const response = {
                total_scans: kpiData.totalScans,
                total_users: kpiData.totalUsers,
                average_scan_accuracy: kpiData.averageScanAccuracy,
                unnormal_scan_count: kpiData.unNormalScanCount,
                total_scans_this_month: kpiData.totalScansThisMonth,
                scan_change_text: kpiData.scanChangeText,
                defect_rate: kpiData.defectRate,
                defect_count_this_month: kpiData.defectCountThisMonth,
                active_users_this_month: kpiData.activeUsersThisMonth,
                user_quota: kpiData.userQuota,
                active_subscription: kpiData.activeSubscription
            };

            if (userId) {
                await getRedisClient().setEx('dashboard:kpi:' + userId, 300, JSON.stringify(response));
                console.log('dashboard:kpi:' + userId);
            } else {
                await getRedisClient().setEx('dashboard:kpi', 300, JSON.stringify(response));
            }

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

    static async getLatestScanDataTrend(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const userRole = req.user?.role;
            const result = await ScanService.getScanDataCountSince(7, userId, userRole);

            if (userRole && userRole !== 'admin' && userId) {
                await getRedisClient().setEx('dashboard:trend:' + userId, 3600, JSON.stringify(result));
            } else {
                await getRedisClient().setEx('dashboard:trend', 3600, JSON.stringify(result));
            }

            return sendResponseMulti(res, 200, 'Trend scan berhasil diambil', result);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }
}