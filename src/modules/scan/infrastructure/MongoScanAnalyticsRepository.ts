// File: src/modules/scan/infrastructure/MongoScanAnalyticsRepository.ts
import { UserDailyKpiModel } from '../../../models/user_daily_kpi.model';
import dayjs from 'dayjs';

export interface MongoScanStats {
    totalScans: number;
    averageScanAccuracy: number;
    unNormalScanCount: number;
    totalScansThisMonth: number;
    totalScansLastMonth: number;
    defectCountThisMonth: number;
    activeUsersThisMonth: number;
}

export class MongoScanAnalyticsRepository {
    /**
     * Mengambil metrik analitik scan yang sudah di-agregasi dari MongoDB
     */
    static async getScanKPIs(
        userId: number | undefined,
        startOfCurrentMonth: Date,
        startOfLastMonth: Date,
        endOfLastMonth: Date
    ): Promise<MongoScanStats> {

        // 1. Siapkan filter berdasarkan User (jika bukan admin)
        const filter: any = {};
        if (userId !== undefined) {
            filter.user_id = userId;
        }

        // Format tanggal ke string "YYYY-MM-DD" agar cocok dengan kolom `date` di DB
        const startOfMonthStr = dayjs(startOfCurrentMonth).format('YYYY-MM-DD');
        const startOfLastMonthStr = dayjs(startOfLastMonth).format('YYYY-MM-DD');
        const endOfLastMonthStr = dayjs(endOfLastMonth).format('YYYY-MM-DD');

        // 2. Jalankan Aggregation Pipeline ringan pada data rekap harian
        const result = await UserDailyKpiModel.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: null,
                    // a. Total scan sepanjang masa (jumlahkan semua hari)
                    totalScans: { $sum: '$total_scans' },

                    // b. Akumulasi seluruh confidence score sepanjang masa
                    accumulatedConfidence: { $sum: '$total_confidence' },

                    // c. Total cacat sepanjang masa
                    unNormalScanCount: { $sum: '$defect_scans' },

                    // d. Total scan bulan ini (filter tanggal >= awal bulan ini)
                    totalScansThisMonth: {
                        $sum: {
                            $cond: [{ $gte: ['$date', startOfMonthStr] }, '$total_scans', 0]
                        }
                    },

                    // e. Total scan bulan lalu (filter tanggal antara awal & akhir bulan lalu)
                    totalScansLastMonth: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $gte: ['$date', startOfLastMonthStr] },
                                        { $lte: ['$date', endOfLastMonthStr] }
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
                                { $gte: ['$date', startOfMonthStr] },
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
                                        { $ne: ['$user_id', 0] }, // Abaikan guest (ID 0)
                                        { $gte: ['$date', startOfMonthStr] }
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

        // Rata-rata akurasi = Total Akumulasi Skor / Total Scan
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
}