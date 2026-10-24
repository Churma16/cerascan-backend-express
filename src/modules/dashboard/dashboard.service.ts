import { quotaService } from "../../services/quota.service";
import { subscriptionService } from "../../services/subscription.service";
import { scanRepository } from "../../repositories/scan.repository";
import { userRepository } from "../../repositories/user.repository";
import { getNowIndonesiaTime } from "../../utils/time.helper";
import dayjs from "dayjs";
import { getRedisClient } from "../../config/redisClient";

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

export class DashboardService {
    static async getDashboardKPI(userId?: number, userRole?: string) {
        const whereClauseUser: Record<string, any> = {};

        if (userRole !== "admin") {
            whereClauseUser.id = userId;
        }

        const startOfCurrentMonth = dayjs(getNowIndonesiaTime()).startOf("month").toDate();
        const startOfLastMonth = dayjs(getNowIndonesiaTime()).subtract(1, "month").startOf("month").toDate();
        const endOfLastMonth = dayjs(getNowIndonesiaTime()).subtract(1, "month").endOf("month").toDate();

        const totalUsers = await userRepository.count({ where: whereClauseUser });
        const mongoUserId = userRole !== "admin" ? userId : undefined;

        const mongoStats = await scanRepository.getScanKpiStatistics(
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
                    quotaService.getUserQuotaDetails(userId).catch((err: any) => {
                        console.error("Gagal mengambil user quota:", err);
                        return null;
                    }),
                    subscriptionService.getActiveSubscriptionByUserId(userId).catch((err: any) => {
                        console.error("Gagal mengambil active subscription:", err);
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
                        plan_name: (activeSubscription as any).plan?.name ?? "Free Plan",
                        status: activeSubscription.status,
                        end_date: activeSubscription.end_date || null
                    };
                }
            } catch (err) {
                console.error("Gagal mengambil data tambahan untuk dashboard:", err);
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
            await getRedisClient().setEx("dashboard:kpi:" + userId, 300, JSON.stringify(response));
        } else {
            await getRedisClient().setEx("dashboard:kpi", 300, JSON.stringify(response));
        }

        return response;
    }
}
