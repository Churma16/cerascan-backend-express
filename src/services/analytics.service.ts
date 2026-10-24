import dayjs from "dayjs";
import { getNowIndonesiaTime } from "../utils/time.util";
import { analyticsRepository, AnalyticsRepository, ModelInsightMetrics } from "../repositories/analytics.repository";
import { userRepository } from "../repositories/user.repository";
import { scanRepository } from "../repositories/scan.repository";
import { quotaService } from "./quota.service";
import { subscriptionService } from "./subscription.service";
import { getRedisClient } from "../config/redisClient";

export class AnalyticsService {
    private repository: AnalyticsRepository;

    constructor(customRepository: AnalyticsRepository = analyticsRepository) {
        this.repository = customRepository;
    }

    async getModelInsightKPI(days: number = 30): Promise<ModelInsightMetrics> {
        const sinceDate = dayjs(getNowIndonesiaTime()).subtract(days, "day").toDate();
        return await this.repository.getModelInsightMetrics(sinceDate);
    }

    async getPredictionDistribution(days: number = 30): Promise<Array<{ prediction: string; total: number }>> {
        const sinceDate = dayjs(getNowIndonesiaTime()).subtract(days, "day").toDate();
        const counts = await this.repository.getPredictionCounts(sinceDate);

        const standardCategories = ["Normal", "Crack", "Scratch", "Stain"];
        const distributions = standardCategories.map(category => ({
            prediction: category,
            total: counts[category.toLowerCase()] || 0
        }));

        const normalItem = distributions.find(item => item.prediction === "Normal");
        const defectItems = distributions
            .filter(item => item.prediction !== "Normal")
            .sort((a, b) => b.total - a.total);

        return normalItem ? [normalItem, ...defectItems] : defectItems;
    }

    async getConfidenceDistribution(days: number = 30): Promise<Array<{ confidenceRanges: string; total: number }>> {
        const sinceDate = dayjs(getNowIndonesiaTime()).subtract(days, "day").toDate();
        const bucketCounts = await this.repository.getConfidenceBuckets(sinceDate);

        const standardRanges = ["<60%", "60-80%", "80-90%", "90-95%", ">95%"];
        return standardRanges.map(range => ({
            confidenceRanges: range,
            total: bucketCounts[range] || 0
        }));
    }

    async getScanTrend(
        limitDays: number = 7,
        userId?: number,
        userRole?: string
    ): Promise<Array<{ date: string; total_scan: number; defect_count: number }>> {
        const now = getNowIndonesiaTime();
        const startDate = new Date(now);
        startDate.setDate(now.getDate() - (limitDays - 1));
        startDate.setHours(0, 0, 0, 0);

        const filterUserId = userRole !== "admin" ? userId : undefined;
        const dbScans = await this.repository.getDailyScanTrend(startDate, filterUserId);

        const results: Array<{ date: string; total_scan: number; defect_count: number }> = [];

        for (let i = limitDays - 1; i >= 0; i--) {
            const targetDate = new Date(now);
            targetDate.setDate(now.getDate() - i);
            const month = String(targetDate.getMonth() + 1).padStart(2, "0");
            const day = String(targetDate.getDate()).padStart(2, "0");
            const dateString = `${month}/${day}`;

            const found = dbScans.find(scan => {
                if (!scan || !scan.date) return false;
                const scanDateStr = String(scan.date);
                return scanDateStr.includes(`${month}-${day}`) || scanDateStr.includes(`${month}/${day}`);
            });

            results.push({
                date: dateString,
                total_scan: found ? Number(found.total_scan) : 0,
                defect_count: found ? Number(found.defect_count) : 0
            });
        }

        const cacheKey = (userRole !== "admin" && userId) ? `dashboard:trend:${userId}` : "dashboard:trend";
        try {
            await getRedisClient().setEx(cacheKey, 3600, JSON.stringify(results));
        } catch (cacheError) {
            console.error("Redis Cache Save Error:", cacheError);
        }

        return results;
    }

    async getDashboardKPI(userId?: number, userRole?: string) {
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
        const scanChangeText = this.calculateTrendText(totalScansLastMonth, totalScansThisMonth);

        const defectRate = totalScansThisMonth > 0
            ? Number(((defectCountThisMonth / totalScansThisMonth) * 100).toFixed(1))
            : 0;

        let quotaResponse = null;
        let subResponse = null;

        if (userId) {
            try {
                const [userQuota, activeSubscription] = await Promise.all([
                    quotaService.getUserQuotaDetails(userId).catch(err => {
                        console.error("Gagal mengambil user quota:", err);
                        return null;
                    }),
                    subscriptionService.getActiveSubscriptionByUserId(userId).catch(err => {
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
                console.error("Gagal mengambil data user untuk dashboard:", err);
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

        const cacheKey = userId ? `dashboard:kpi:${userId}` : "dashboard:kpi";
        try {
            await getRedisClient().setEx(cacheKey, 300, JSON.stringify(response));
        } catch (cacheError) {
            console.error("Redis Cache Save Error:", cacheError);
        }

        return response;
    }

    private calculateTrendText(totalScansLastMonth: number, totalScansThisMonth: number): string {
        if (totalScansLastMonth > 0) {
            const diff = totalScansThisMonth - totalScansLastMonth;
            const pct = Math.round((diff / totalScansLastMonth) * 100);
            if (pct > 0) return `Naik ${pct}% dari bulan lalu`;
            if (pct < 0) return `Turun ${Math.abs(pct)}% dari bulan lalu`;
            return "Stabil dari bulan lalu";
        }
        if (totalScansThisMonth > 0) return "Naik 100% dari bulan lalu";
        return "Stabil dari bulan lalu";
    }
}

export const analyticsService = new AnalyticsService();
