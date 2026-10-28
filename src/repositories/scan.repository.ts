import { Transaction, FindOptions, Order, CreationAttributes } from "sequelize";
import dayjs from "dayjs";
import { Scan } from "../models";
import { ScanAttributes } from "../models/scan.model";
import { UserDailyKpiModel } from "../models/userDailyKpi.model";
import { ScanAnalyticsModel } from "../models/scanAnalytics.model";

export interface ScanKpiStatistics {
    totalScans: number;
    averageScanAccuracy: number;
    unNormalScanCount: number;
    totalScansThisMonth: number;
    totalScansLastMonth: number;
    defectCountThisMonth: number;
    activeUsersThisMonth: number;
}

export interface ScanAnalyticsPayload {
    scan_id: string;
    user_id: number;
    prediction: string;
    confidence_score: number;
    inference_time: number;
}

export class ScanRepository {
    async findById(id: number, transaction?: Transaction): Promise<Scan | null> {
        return await Scan.findByPk(id, { transaction });
    }

    async findByScanId(scanId: string, transaction?: Transaction): Promise<Scan | null> {
        return await Scan.findOne({
            where: { scan_id: scanId },
            transaction
        });
    }

    async findAndCountAll(options: {
        where?: any;
        order?: Order;
        limit?: number;
        offset?: number;
        transaction?: Transaction;
    }): Promise<{ count: number; rows: Scan[] }> {
        return await Scan.findAndCountAll(options);
    }

    async findAll(options?: FindOptions): Promise<Scan[]> {
        return await Scan.findAll(options);
    }

    async count(options?: any): Promise<number> {
        return (await (Scan as any).count(options)) as number;
    }

    async aggregate(field: string, aggregateFunction: string, options?: any): Promise<any> {
        return await (Scan as any).aggregate(field, aggregateFunction, options);
    }

    async create(payload: CreationAttributes<Scan>, transaction?: Transaction): Promise<Scan> {
        return await Scan.create(payload as any, { transaction });
    }

    async update(id: number, payload: Partial<CreationAttributes<Scan>>, transaction?: Transaction): Promise<number> {
        const [affectedCount] = await Scan.update(payload, {
            where: { id },
            transaction
        });
        return affectedCount;
    }

    async destroy(id: number, transaction?: Transaction): Promise<boolean> {
        const targetScan = await Scan.findByPk(id, { transaction });
        if (targetScan) {
            await targetScan.destroy({ transaction });
            return true;
        }
        return false;
    }

    async countSince(userId: number | undefined, sinceDate: Date): Promise<number> {
        const whereClause: any = {
            created_at: {
                [dayjs().isValid() ? "$gte" : ">="]: sinceDate
            }
        };
        if (userId !== undefined) {
            whereClause.user_id = userId;
        }
        return await Scan.count({ where: whereClause });
    }

    // --- MongoDB Operations ---

    async recordAnalytics(payload: ScanAnalyticsPayload): Promise<void> {
        const analyticsEntry = new ScanAnalyticsModel({
            scan_id: payload.scan_id,
            user_id: payload.user_id,
            prediction: payload.prediction,
            confidence_score: payload.confidence_score,
            inference_time: payload.inference_time
        });
        await analyticsEntry.save();
    }

    async incrementScanKpi(
        userId: number,
        confidenceScore: number,
        isDefect: boolean
    ): Promise<void> {
        const currentDateString = dayjs().format("YYYY-MM-DD");

        await UserDailyKpiModel.findOneAndUpdate(
            {
                user_id: userId,
                date: currentDateString
            },
            {
                $inc: {
                    total_scans: 1,
                    total_confidence: confidenceScore,
                    defect_scans: isDefect ? 1 : 0,
                    normal_scans: isDefect ? 0 : 1
                }
            },
            {
                upsert: true,
                new: true
            }
        );
    }

    async getScanKpiStatistics(
        userId: number | undefined,
        startOfCurrentMonth: Date,
        startOfLastMonth: Date,
        endOfLastMonth: Date
    ): Promise<ScanKpiStatistics> {
        const matchFilter: any = {};
        if (userId !== undefined) {
            matchFilter.user_id = userId;
        }

        const startOfCurrentMonthString = dayjs(startOfCurrentMonth).format("YYYY-MM-DD");
        const startOfLastMonthString = dayjs(startOfLastMonth).format("YYYY-MM-DD");
        const endOfLastMonthString = dayjs(endOfLastMonth).format("YYYY-MM-DD");

        const aggregationResults = await UserDailyKpiModel.aggregate([
            { $match: matchFilter },
            {
                $group: {
                    _id: null,
                    totalScans: { $sum: "$total_scans" },
                    accumulatedConfidence: { $sum: "$total_confidence" },
                    unNormalScanCount: { $sum: "$defect_scans" },
                    totalScansThisMonth: {
                        $sum: {
                            $cond: [{ $gte: ["$date", startOfCurrentMonthString] }, "$total_scans", 0]
                        }
                    },
                    totalScansLastMonth: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $gte: ["$date", startOfLastMonthString] },
                                        { $lte: ["$date", endOfLastMonthString] }
                                    ]
                                },
                                "$total_scans",
                                0
                            ]
                        }
                    },
                    defectCountThisMonth: {
                        $sum: {
                            $cond: [{ $gte: ["$date", startOfCurrentMonthString] }, "$defect_scans", 0]
                        }
                    },
                    activeUsersArray: {
                        $addToSet: {
                            $cond: [
                                {
                                    $and: [
                                        { $ne: ["$user_id", 0] },
                                        { $gte: ["$date", startOfCurrentMonthString] }
                                    ]
                                },
                                "$user_id",
                                "$$REMOVE"
                            ]
                        }
                    }
                }
            }
        ]);

        if (aggregationResults.length === 0) {
            return {
                totalScans: 0,
                averageScanAccuracy: 0,
                unNormalScanCount: 0,
                totalScansThisMonth: 0,
                totalScansLastMonth: 0,
                defectCountThisMonth: 0,
                activeUsersThisMonth: 0
            };
        }

        const aggregatedData = aggregationResults[0];
        const averageAccuracy = aggregatedData.totalScans > 0
            ? aggregatedData.accumulatedConfidence / aggregatedData.totalScans
            : 0;

        return {
            totalScans: aggregatedData.totalScans || 0,
            averageScanAccuracy: Number(averageAccuracy.toFixed(2)) || 0,
            unNormalScanCount: aggregatedData.unNormalScanCount || 0,
            totalScansThisMonth: aggregatedData.totalScansThisMonth || 0,
            totalScansLastMonth: aggregatedData.totalScansLastMonth || 0,
            defectCountThisMonth: aggregatedData.defectCountThisMonth || 0,
            activeUsersThisMonth: aggregatedData.activeUsersArray ? aggregatedData.activeUsersArray.length : 0
        };
    }
}

export const scanRepository = new ScanRepository();
