import User from "../../models/user.model";
import Scan from "../../models/scan.model";
import { UserQuotaService } from "../user_quota/user_quota.service";
import { SubscriptionService } from "../subscription/subscription.service";
import { getNowIndonesiaTime } from "../../utils/time.helper";
import { getRedisClient } from "../../config/redis_client";
import dayjs from "dayjs";
import { Op } from "sequelize";

export interface DashboardKPIResult {
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

        const whereClauseScan: Record<string, any> = {};
        const whereClauseUser: Record<string, any> = {};

        if (userRole !== 'admin') {
            whereClauseScan.user_id = userId;
            whereClauseUser.id = userId;
        }

        // Setup Tanggal
        const startOfCurrentMonth = dayjs(getNowIndonesiaTime()).startOf('month').toDate();
        const startOfLastMonth = dayjs(getNowIndonesiaTime()).subtract(1, 'month').startOf('month').toDate();
        const endOfLastMonth = dayjs(getNowIndonesiaTime()).subtract(1, 'month').endOf('month').toDate();

        const defectTypes = ['crack', 'scratch', 'stain'];

        const [
            totalScans,
            totalUsers,
            avgAccuracy,
            unNormalScanCount,
            totalScansThisMonth,
            totalScansLastMonth,
            defectCountThisMonth,
            activeUsersThisMonth
        ] = await Promise.all([
            Scan.count({ where: whereClauseScan }),

            User.count({ where: whereClauseUser }),

            Scan.aggregate('confidence', 'avg', { where: whereClauseScan }),

            Scan.count({
                where: {
                    ...whereClauseScan,
                    prediction: { [Op.in]: defectTypes }
                }
            }),

            Scan.count({
                where: {
                    ...whereClauseScan,
                    createdAt: { [Op.gte]: startOfCurrentMonth }
                }
            }),

            Scan.count({
                where: {
                    ...whereClauseScan,
                    createdAt: {
                        [Op.gte]: startOfLastMonth,
                        [Op.lte]: endOfLastMonth
                    }
                }
            }),

            Scan.count({
                where: {
                    ...whereClauseScan,
                    prediction: { [Op.in]: defectTypes },
                    createdAt: { [Op.gte]: startOfCurrentMonth }
                }
            }),

            Scan.count({
                distinct: true,
                col: 'user_id',
                where: {
                    user_id: { [Op.ne]: null as any },
                    createdAt: { [Op.gte]: startOfCurrentMonth }
                }
            })
        ]);

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

        const defectRate = totalScansThisMonth > 0
            ? Number(((defectCountThisMonth / totalScansThisMonth) * 100).toFixed(1))
            : 0;

        let quotaResponse = null;
        let subResponse = null;

        if (userId) {
            try {
                const [userQuota, activeSubscription] = await Promise.all([
                    UserQuotaService.getUserQuotaByUserId(userId).catch(err => {
                        console.error('Gagal mengambil user quota:', err);
                        return null;
                    }),
                    SubscriptionService.getActiveSubscriptionsByUserId(userId).catch(err => {
                        console.error('Gagal mengambil active subscription:', err);
                        return null;
                    })
                ]);

                if (userQuota) {
                    const redis = getRedisClient();
                    const userQuotaKey = `user:${userId}:remaining_quota`;
                    const remainingQuota = await redis.get(userQuotaKey);

                    const total = userQuota.total_quota ?? 0;
                    let used = userQuota.used_quota ?? 0;
                    let remaining = total - used;

                    if (remainingQuota !== null && remainingQuota !== undefined) {
                        remaining = parseInt(remainingQuota);
                        used = total - remaining;
                        if (used < 0) used = 0;
                    } else {
                        await redis.set(userQuotaKey, remaining.toString(), 'EX', 86400);
                    }

                    const isLow = total > 0 && (remaining / total <= 0.2 || remaining <= 200);

                    quotaResponse = {
                        total_quota: total,
                        used_quota: used,
                        remaining_quota: remaining,
                        is_quota_low: isLow,
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

        return {
            totalScans,
            totalUsers,
            averageScanAccuracy: Number(avgAccuracy) || 0,
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