import dayjs from "dayjs";
import { getNowIndonesiaTime } from "../../../utils/time.util";
import { scanRepository, ScanRepository } from "../../../repositories/scan.repository";
import { quotaService, QuotaService } from "../../../services/quota.service";
import { subscriptionService, SubscriptionService } from "../../../services/subscription.service";
import { getRedisClient } from "../../../config/redisClient";
import {
    calculateTrendPercentageText,
    DashboardKpiResponseDto
} from "./dashboardKpi.types";

export class GetUserDashboardKpiQueryHandler {
    constructor(
        private readonly scanRepo: ScanRepository = scanRepository,
        private readonly quotaSvc: QuotaService = quotaService,
        private readonly subSvc: SubscriptionService = subscriptionService
    ) {}

    async execute(userId: number): Promise<DashboardKpiResponseDto> {
        const startOfCurrentMonth = dayjs(getNowIndonesiaTime()).startOf("month").toDate();
        const startOfLastMonth = dayjs(getNowIndonesiaTime()).subtract(1, "month").startOf("month").toDate();
        const endOfLastMonth = dayjs(getNowIndonesiaTime()).subtract(1, "month").endOf("month").toDate();

        const [userScanStats, userQuotaDetails, activeSubscriptionDetails] = await Promise.all([
            this.scanRepo.getScanKpiStatistics(
                userId,
                startOfCurrentMonth,
                startOfLastMonth,
                endOfLastMonth
            ),
            this.quotaSvc.getUserQuotaDetails(userId).catch(error => {
                console.error(`[GetUserDashboardKpiQueryHandler] Gagal mengambil kuota untuk userId ${userId}:`, error);
                return null;
            }),
            this.subSvc.getActiveSubscriptionByUserId(userId).catch(error => {
                console.error(`[GetUserDashboardKpiQueryHandler] Gagal mengambil langganan untuk userId ${userId}:`, error);
                return null;
            })
        ]);

        const totalScansThisMonth = userScanStats.totalScansThisMonth;
        const totalScansLastMonth = userScanStats.totalScansLastMonth;
        const defectCountThisMonth = userScanStats.defectCountThisMonth;
        const scanChangeText = calculateTrendPercentageText(totalScansLastMonth, totalScansThisMonth);

        const defectRate = totalScansThisMonth > 0
            ? Number(((defectCountThisMonth / totalScansThisMonth) * 100).toFixed(1))
            : 0;

        let quotaResponsePayload = null;
        if (userQuotaDetails) {
            quotaResponsePayload = {
                total_quota: userQuotaDetails.total_quota,
                used_quota: userQuotaDetails.used_quota,
                remaining_quota: userQuotaDetails.remaining_quota,
                is_quota_low: userQuotaDetails.is_quota_low,
                next_reset_date: userQuotaDetails.next_reset_date || null
            };
        }

        let subscriptionResponsePayload = null;
        if (activeSubscriptionDetails) {
            subscriptionResponsePayload = {
                plan_name: (activeSubscriptionDetails as any).plan?.name ?? "Free Plan",
                status: activeSubscriptionDetails.status,
                end_date: activeSubscriptionDetails.end_date || null
            };
        }

        const responsePayload: DashboardKpiResponseDto = {
            total_scans: userScanStats.totalScans,
            total_users: 1,
            average_scan_accuracy: Number(userScanStats.averageScanAccuracy) || 0,
            unnormal_scan_count: userScanStats.unNormalScanCount,
            total_scans_this_month: totalScansThisMonth,
            scan_change_text: scanChangeText,
            defect_rate: defectRate,
            defect_count_this_month: defectCountThisMonth,
            active_users_this_month: userScanStats.activeUsersThisMonth,
            user_quota: quotaResponsePayload,
            active_subscription: subscriptionResponsePayload
        };

        const redisCacheKey = `dashboard:kpi:${userId}`;
        try {
            await getRedisClient().setEx(redisCacheKey, 300, JSON.stringify(responsePayload));
        } catch (cacheError) {
            console.error(`[GetUserDashboardKpiQueryHandler] Redis Cache Save Error untuk user ${userId}:`, cacheError);
        }

        return responsePayload;
    }
}
