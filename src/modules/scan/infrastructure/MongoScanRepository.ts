import {UserDailyKpiModel} from '../../../models/userDailyKpi.model';
import dayjs from 'dayjs';
import {AnalyticsModel} from "../../../models/analytics.model";

export interface MongoScanStats {
    totalScans: number;
    averageScanAccuracy: number;
    unNormalScanCount: number;
    totalScansThisMonth: number;
    totalScansLastMonth: number;
    defectCountThisMonth: number;
    activeUsersThisMonth: number;
}

export class MongoScanRepository {
    static async getScanKPIs(
        userId: number | undefined,
        startOfCurrentMonth: Date,
        startOfLastMonth: Date,
        endOfLastMonth: Date
    ): Promise<MongoScanStats> {

        const filter: any = {};
        if (userId !== undefined) {
            filter.user_id = userId;
        }

        const startOfMonthStr = dayjs(startOfCurrentMonth).format('YYYY-MM-DD');
        const startOfLastMonthStr = dayjs(startOfLastMonth).format('YYYY-MM-DD');
        const endOfLastMonthStr = dayjs(endOfLastMonth).format('YYYY-MM-DD');

        const result = await UserDailyKpiModel.aggregate([
            {$match: filter},
            {
                $group: {
                    _id: null,
                    // a. Total scan sepanjang masa (jumlahkan semua hari)
                    totalScans: {$sum: '$total_scans'},

                    // b. Akumulasi seluruh confidence score sepanjang masa
                    accumulatedConfidence: {$sum: '$total_confidence'},

                    // c. Total cacat sepanjang masa
                    unNormalScanCount: {$sum: '$defect_scans'},

                    // d. Total scan bulan ini (filter tanggal >= awal bulan ini)
                    totalScansThisMonth: {
                        $sum: {
                            $cond: [{$gte: ['$date', startOfMonthStr]}, '$total_scans', 0]
                        }
                    },

                    // e. Total scan bulan lalu (filter tanggal antara awal & akhir bulan lalu)
                    totalScansLastMonth: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        {$gte: ['$date', startOfLastMonthStr]},
                                        {$lte: ['$date', endOfLastMonthStr]}
                                    ]
                                },
                                '$total_scans',
                                0
                            ]
                        }
                    },

                    // f. Total cacat bulan ini
                    defectCountThisMonth: {
                        $sum: {
                            $cond: [
                                {$gte: ['$date', startOfMonthStr]},
                                '$defect_scans',
                                0
                            ]
                        }
                    },

                    // g. Kumpulkan user_id unik yang melakukan scan bulan ini
                    activeUsersArray: {
                        $addToSet: {
                            $cond: [
                                {
                                    $and: [
                                        {$ne: ['$user_id', 0]},
                                        {$gte: ['$date', startOfMonthStr]}
                                    ]
                                },
                                '$user_id',
                                '$$REMOVE'
                            ]
                        }
                    }
                }
            }
        ]);

        if (result.length === 0) {
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

        const data = result[0];

        const averageScanAccuracy = data.totalScans > 0
            ? data.accumulatedConfidence / data.totalScans
            : 0;

        return {
            totalScans: data.totalScans || 0,
            averageScanAccuracy: Number(averageScanAccuracy.toFixed(2)) || 0,
            unNormalScanCount: data.unNormalScanCount || 0,
            totalScansThisMonth: data.totalScansThisMonth || 0,
            totalScansLastMonth: data.totalScansLastMonth || 0,
            defectCountThisMonth: data.defectCountThisMonth || 0,
            activeUsersThisMonth: data.activeUsersArray ? data.activeUsersArray.length : 0
        };
    }

    static async incrementScanKpi(
        userId: number,
        confidenceScore: number,
        isDefect: boolean
    ): Promise<void> {
        const todayDateStr = dayjs().format('YYYY-MM-DD');

        await UserDailyKpiModel.findOneAndUpdate(
            {
                user_id: userId,
                date: todayDateStr
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

    static async saveScanAnalytics(payload: {
        scan_id: string;
        user_id: number;
        prediction: string;
        confidence_score: number;
        inference_time: number;
    }): Promise<void> {
        const analyticsData = new AnalyticsModel({
            scan_id: payload.scan_id,
            user_id: payload.user_id,
            prediction: payload.prediction,
            confidence_score: payload.confidence_score,
            inference_time: payload.inference_time
        });

        await analyticsData.save();
    }
}