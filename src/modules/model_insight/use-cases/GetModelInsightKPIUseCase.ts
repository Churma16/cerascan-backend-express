import dayjs from "dayjs";
import { getNowIndonesiaTime } from "../../../utils/time.helper";
import { Scan } from "../../../models";
import { Op } from "sequelize";

export class GetModelInsightKPIUseCase {
    async execute() {
        const thirtyDaysAgo = dayjs(getNowIndonesiaTime()).subtract(30, 'day').toDate();

        const averageAccuracy = await Scan.aggregate('confidence', 'avg', {
            where: {
                createdAt: { [Op.gte]: thirtyDaysAgo }
            }
        });

        const averageInference = await Scan.aggregate('inference_time', 'avg', {
            where: {
                createdAt: { [Op.gte]: thirtyDaysAgo }
            }
        });

        const totalScan = await Scan.count({
            where: {
                createdAt: { [Op.gte]: thirtyDaysAgo }
            }
        });

        const unConfidentScanCount = await Scan.count({
            where: {
                confidence: {
                    [Op.lt]: 80
                },
                createdAt: {
                    [Op.gte]: thirtyDaysAgo
                }
            }
        });

        return {
            averageInference: averageInference,
            averageAccuracy: averageAccuracy,
            totalScan: totalScan,
            unConfidentScanCount: unConfidentScanCount
        };
    }
}
