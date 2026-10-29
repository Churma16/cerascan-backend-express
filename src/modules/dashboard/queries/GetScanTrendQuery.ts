import { getNowIndonesiaTime } from "../../../utils/time.util";
import { analyticsRepository, AnalyticsRepository } from "../../../repositories/analytics.repository";
import { getRedisClient } from "../../../config/redisClient";

export interface ScanTrendItemDto {
    date: string;
    total_scan: number;
    defect_count: number;
}

export class GetScanTrendQueryHandler {
    constructor(
        private readonly analyticsRepo: AnalyticsRepository = analyticsRepository
    ) {}

    async execute(
        limitDays: number = 7,
        userId?: number,
        userRole?: string
    ): Promise<ScanTrendItemDto[]> {
        const currentIndonesiaTime = getNowIndonesiaTime();
        const startDateFilter = new Date(currentIndonesiaTime);
        startDateFilter.setDate(currentIndonesiaTime.getDate() - (limitDays - 1));
        startDateFilter.setHours(0, 0, 0, 0);

        const filterUserId = userRole !== "admin" ? userId : undefined;
        const databaseScanTrends = await this.analyticsRepo.getDailyScanTrend(startDateFilter, filterUserId);

        const dailyTrendResults: ScanTrendItemDto[] = [];

        for (let dayOffset = limitDays - 1; dayOffset >= 0; dayOffset--) {
            const targetDate = new Date(currentIndonesiaTime);
            targetDate.setDate(currentIndonesiaTime.getDate() - dayOffset);
            const monthString = String(targetDate.getMonth() + 1).padStart(2, "0");
            const dayString = String(targetDate.getDate()).padStart(2, "0");
            const dateDisplayString = `${monthString}/${dayString}`;

            const matchingScan = databaseScanTrends.find(scanRow => {
                if (!scanRow || !scanRow.date) return false;
                const scanDateString = String(scanRow.date);
                return scanDateString.includes(`${monthString}-${dayString}`) || scanDateString.includes(`${monthString}/${dayString}`);
            });

            dailyTrendResults.push({
                date: dateDisplayString,
                total_scan: matchingScan ? Number(matchingScan.total_scan) : 0,
                defect_count: matchingScan ? Number(matchingScan.defect_count) : 0
            });
        }

        const redisCacheKey = (userRole !== "admin" && userId)
            ? `dashboard:trend:${userId}`
            : "dashboard:trend";

        try {
            await getRedisClient().setEx(redisCacheKey, 3600, JSON.stringify(dailyTrendResults));
        } catch (cacheError) {
            console.error("[GetScanTrendQueryHandler] Redis Cache Save Error:", cacheError);
        }

        return dailyTrendResults;
    }
}
