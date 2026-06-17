import User from "../../models/user.model";
import Scan from "../../models/scan.model";
import {UserQuotaService} from "../user_quota/user_quota.service";
import {SubscriptionService} from "../subscription/subscription.service";
import {getNowIndonesiaTime} from "../../utils/time.helper";
import dayjs from "dayjs";
import {Op} from "sequelize";

interface DashboardKPIResult {
    totalScans: number;
    totalUsers: number;
    averageScanAccuracy: number;
    unNormalScanCount: number;
    totalScansThisMonth: number;
    scanChangeText: string;
    defectRate: number;
    defectCountThisMonth: number;
    activeUsersThisMonth: number;
    userQuota: {
        total_quota: number;
        used_quota: number;
        remaining_quota: number;
        is_quota_low: boolean;
        next_reset_date: Date | null;
    } | null;
    activeSubscription: {
        plan_name: string;
        status: string;
        end_date: Date | null;
    } | null;
}

export class DashboardService {
    static async getDashboardKPI(userId: number | undefined, userRole: string | undefined): Promise<DashboardKPIResult> {
        const whereClause: Record<string, any> = {};

        if (userRole !== 'admin') {
            whereClause.user_id = userId;
        }

        const thirtyDaysAgo = dayjs(getNowIndonesiaTime()).subtract(30, 'day').toDate();

        const totalScans = await Scan.count({
            where: {
                ...whereClause,
                createdAt: {[Op.gte]: thirtyDaysAgo}
            },
        });

        const totalUsers = await User.count({
            where: whereClause,
        });

        const avgAccuracy = await Scan.aggregate('confidence', 'avg', {
            where: whereClause,
        }) || 0;

        const unNormalScanCount = await Scan.count({
            where: {
                ...whereClause,
                prediction: ['crack', 'scratch', 'stain']
            }
        });

        // Current and Last Month Scans & Defect calculations
        const startOfCurrentMonth = dayjs(getNowIndonesiaTime()).startOf('month').toDate();
        const startOfLastMonth = dayjs(getNowIndonesiaTime()).subtract(1, 'month').startOf('month').toDate();
        const endOfLastMonth = dayjs(getNowIndonesiaTime()).subtract(1, 'month').endOf('month').toDate();

        const totalScansThisMonth = await Scan.count({
            where: {
                ...whereClause,
                createdAt: { [Op.gte]: startOfCurrentMonth }
            }
        });

        const totalScansLastMonth = await Scan.count({
            where: {
                ...whereClause,
                createdAt: {
                    [Op.gte]: startOfLastMonth,
                    [Op.lte]: endOfLastMonth
                }
            }
        });

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

        const defectCountThisMonth = await Scan.count({
            where: {
                ...whereClause,
                prediction: ['crack', 'scratch', 'stain'],
                createdAt: { [Op.gte]: startOfCurrentMonth }
            }
        });

        const defectRate = totalScansThisMonth > 0
            ? Number(((defectCountThisMonth / totalScansThisMonth) * 100).toFixed(1))
            : 0;

        const activeUsersThisMonth = await Scan.count({
            distinct: true,
            col: 'user_id',
            where: {
                user_id: { [Op.ne]: null as any },
                createdAt: { [Op.gte]: startOfCurrentMonth }
            }
        });

        let quotaResponse = null;
        if (userId) {
            try {
                const userQuota = await UserQuotaService.getUserQuotaByUserId(userId);
                if (userQuota) {
                    const total = userQuota.total_quota ?? 0;
                    const used = userQuota.used_quota ?? 0;
                    const remaining = total - used;
                    const isLow = total > 0 && (remaining / total <= 0.2 || remaining <= 200);
                    quotaResponse = {
                        total_quota: total,
                        used_quota: used,
                        remaining_quota: remaining,
                        is_quota_low: isLow,
                        next_reset_date: userQuota.next_reset_date || null
                    };
                }
            } catch (err) {
                console.error('Gagal mengambil user quota untuk dashboard:', err);
            }
        }

        let subResponse = null;
        if (userId) {
            try {
                const activeSubscription = await SubscriptionService.getActiveSubscriptionsByUserId(userId);
                if (activeSubscription) {
                    subResponse = {
                        plan_name: activeSubscription.plan?.name ?? 'Free Plan',
                        status: activeSubscription.status,
                        end_date: activeSubscription.end_date || null
                    };
                }
            } catch (err) {
                console.error('Gagal mengambil active subscription untuk dashboard:', err);
            }
        }

        return {
            totalScans,
            totalUsers,
            averageScanAccuracy: Number(avgAccuracy),
            unNormalScanCount,
            totalScansThisMonth,
            scanChangeText,
            defectRate,
            defectCountThisMonth,
            activeUsersThisMonth,
            userQuota: quotaResponse,
            activeSubscription: subResponse
        };
    }
}
