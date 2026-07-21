import { Request, Response } from "express";
import { sendResponse, sendResponseMulti } from "../../utils/response";
import { GetScanHistoryUseCase } from "../scan/use-cases/GetScanHistoryUseCase";
import { GetScanDataCountSinceUseCase } from "../scan/use-cases/GetScanDataCountSinceUseCase";
import { getRedisClient } from "../../config/redisClient";
import { AuthRequest } from '../../middleware/auth.middleware';
import { GetUserQuotaByUserIdUseCase } from '../userQuota/use-cases/GetUserQuotaByUserIdUseCase';
import { GetActiveSubscriptionUseCase } from '../subscription/use-cases/GetActiveSubscriptionUseCase';
import { getNowIndonesiaTime } from '../../utils/time.helper';
import dayjs from "dayjs";
import { SequelizeUserRepository } from "../user/infrastructure/SequelizeUserRepository";
import { SequelizeScanRepository } from "../scan/infrastructure/SequelizeScanRepository";
import { MongoScanRepository } from "../scan/infrastructure/MongoScanRepository";

const userRepository = new SequelizeUserRepository();
const scanRepository = new SequelizeScanRepository();

function getTrendText(totalScansLastMonth: number, totalScansThisMonth: number) {
    let scanChangeText = "Stabil dari bulan lalu";
    if (totalScansLastMonth > 0) {
        const diff = totalScansThisMonth - totalScansLastMonth;
        const pct = Math.round((diff / totalScansLastMonth) * 100);
        if (pct > 0) {
            scanChangeText = `Naik ${pct}% dari bulan lalu`;
        } else if (pct < 0) {
            scanChangeText = `Turun ${Math.abs(pct)}% dari bulan lalu`;
        }
    } else if (totalScansThisMonth > 0) {
        scanChangeText = `Naik 100% dari bulan lalu`;
    }
    return scanChangeText;
}

export class DashboardController {
    static async getDashboardKpi(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const userRole = req.user?.role;

            const whereClauseScan: Record<string, any> = {};
            const whereClauseUser: Record<string, any> = {};

            if (userRole !== 'admin') {
                whereClauseScan.user_id = userId;
                whereClauseUser.id = userId;
            }

            const startOfCurrentMonth = dayjs(getNowIndonesiaTime()).startOf('month').toDate();
            const startOfLastMonth = dayjs(getNowIndonesiaTime()).subtract(1, 'month').startOf('month').toDate();
            const endOfLastMonth = dayjs(getNowIndonesiaTime()).subtract(1, 'month').endOf('month').toDate();

            const totalUsers = await userRepository.count({ where: whereClauseUser });
            const mongoUserId = userRole !== 'admin' ? userId : undefined;

            const mongoStats = await MongoScanRepository.getScanKPIs(
                mongoUserId,
                startOfCurrentMonth,
                startOfLastMonth,
                endOfLastMonth
            );

            const totalScansThisMonth = mongoStats.totalScansThisMonth;
            const totalScansLastMonth = mongoStats.totalScansLastMonth;
            const defectCountThisMonth = mongoStats.defectCountThisMonth;
            const scanChangeText = getTrendText(totalScansLastMonth, totalScansThisMonth);

            const defectRate = totalScansThisMonth > 0
                ? Number(((defectCountThisMonth / totalScansThisMonth) * 100).toFixed(1))
                : 0;

            let quotaResponse = null;
            let subResponse = null;

            if (userId) {
                try {
                    const [userQuota, activeSubscription] = await Promise.all([
                        (new GetUserQuotaByUserIdUseCase()).execute(userId).catch((err: any) => {
                            console.error('Gagal mengambil user quota:', err);
                            return null;
                        }),
                        (new GetActiveSubscriptionUseCase()).execute(userId).catch((err: any) => {
                            console.error('Gagal mengambil active subscription:', err);
                            return null;
                        })
                    ]);

                    if (userQuota) {
                        quotaResponse = {
                            total_quota: userQuota.total_quota,
                            used_quota: userQuota.used_quota,
                            remaining_quota: userQuota.remaining_quota,
                            is_quota_low: userQuota.is_quota_low,
                            next_reset_date: userQuota.next_reset_date || null
                        };
                    }

                    if (activeSubscription) {
                        subResponse = {
                            plan_name: activeSubscription.plan?.name ?? 'Free Plan',
                            status: activeSubscription.status,
                            end_date: activeSubscription.end_date || null
                        };
                    }
                } catch (err) {
                    console.error('Gagal mengambil data tambahan untuk dashboard:', err);
                }
            }

            const response = {
                total_scans: mongoStats.totalScans,
                total_users: totalUsers,
                average_scan_accuracy: Number(mongoStats.averageScanAccuracy) || 0,
                unnormal_scan_count: mongoStats.unNormalScanCount,
                total_scans_this_month: totalScansThisMonth,
                scan_change_text: scanChangeText,
                defect_rate: defectRate,
                defect_count_this_month: defectCountThisMonth,
                active_users_this_month: mongoStats.activeUsersThisMonth,
                user_quota: quotaResponse,
                active_subscription: subResponse
            };

            if (userId) {
                await getRedisClient().setEx('dashboard:kpi:' + userId, 300, JSON.stringify(response));
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
            const useCase = new GetScanHistoryUseCase();
            const scanData = await useCase.execute(5);
            return sendResponseMulti(res, 200, "Data scan terbaru berhasil diambil", scanData);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async getLatestScanDataTrend(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const userRole = req.user?.role;
            const useCase = new GetScanDataCountSinceUseCase();
            const result = await useCase.execute(7, userId, userRole);

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
