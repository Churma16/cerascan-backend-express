import { col, fn, literal, Op } from "sequelize";
import { Scan } from "../models";

export interface ModelInsightMetrics {
    averageInference: number;
    averageAccuracy: number;
    totalScan: number;
    unConfidentScanCount: number;
}

export interface DailyTrendRow {
    date: string;
    total_scan: number | string;
    defect_count: number | string;
}

export class AnalyticsRepository {
    async getModelInsightMetrics(sinceDate: Date): Promise<ModelInsightMetrics> {
        const [averageAccuracy, averageInference, totalScan, unConfidentScanCount] = await Promise.all([
            (Scan as any).aggregate("confidence", "avg", {
                where: { createdAt: { [Op.gte]: sinceDate } }
            }),
            (Scan as any).aggregate("inference_time", "avg", {
                where: { createdAt: { [Op.gte]: sinceDate } }
            }),
            (Scan as any).count({
                where: { createdAt: { [Op.gte]: sinceDate } }
            }),
            (Scan as any).count({
                where: {
                    confidence: { [Op.lt]: 80 },
                    createdAt: { [Op.gte]: sinceDate }
                }
            })
        ]);

        return {
            averageInference: Number(averageInference) || 0,
            averageAccuracy: Number(averageAccuracy) || 0,
            totalScan: Number(totalScan) || 0,
            unConfidentScanCount: Number(unConfidentScanCount) || 0
        };
    }

    async getPredictionCounts(sinceDate: Date): Promise<Record<string, number>> {
        const rows = await Scan.findAll({
            attributes: [
                "prediction",
                [fn("COUNT", col("id")), "total"]
            ],
            where: {
                createdAt: { [Op.gte]: sinceDate }
            },
            group: ["prediction"],
            raw: true
        });

        const countMap: Record<string, number> = {};
        for (const row of rows as any[]) {
            if (row.prediction) {
                countMap[String(row.prediction).toLowerCase()] = Number(row.total) || 0;
            }
        }
        return countMap;
    }

    async getConfidenceBuckets(sinceDate: Date): Promise<Record<string, number>> {
        const caseExpression = literal(`
            CASE 
                WHEN confidence < 60 THEN '<60%'
                WHEN confidence >= 60 AND confidence < 80 THEN '60-80%'
                WHEN confidence >= 80 AND confidence < 90 THEN '80-90%'
                WHEN confidence >= 90 AND confidence < 95 THEN '90-95%'
                ELSE '>95%'
            END
        `);

        const rows = await Scan.findAll({
            attributes: [
                [caseExpression, "confidenceRange"],
                [fn("COUNT", col("id")), "total"]
            ],
            where: {
                createdAt: { [Op.gte]: sinceDate }
            },
            group: [caseExpression as any],
            raw: true
        });

        const bucketMap: Record<string, number> = {};
        for (const row of rows as any[]) {
            const key = row.confidenceRange || row["confidenceRange"];
            if (key) {
                bucketMap[key] = Number(row.total) || 0;
            }
        }
        return bucketMap;
    }

    async getDailyScanTrend(sinceDate: Date, userId?: number): Promise<DailyTrendRow[]> {
        const whereClause: any = {
            createdAt: { [Op.gte]: sinceDate }
        };
        if (userId !== undefined) {
            whereClause.user_id = userId;
        }

        return await Scan.findAll({
            attributes: [
                [fn("DATE", col("createdAt")), "date"],
                [fn("COUNT", col("id")), "total_scan"],
                [literal("SUM(CASE WHEN prediction != 'normal' THEN 1 ELSE 0 END)"), "defect_count"]
            ],
            where: whereClause,
            group: [fn("DATE", col("createdAt"))],
            order: [[fn("DATE", col("createdAt")), "ASC"]],
            raw: true
        }) as unknown as DailyTrendRow[];
    }
}

export const analyticsRepository = new AnalyticsRepository();
