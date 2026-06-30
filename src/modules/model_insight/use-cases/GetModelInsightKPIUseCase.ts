import dayjs from "dayjs";
import { getNowIndonesiaTime } from "../../../utils/time.helper";
import { Op } from "sequelize";
import { IScanRepository } from "../../scan/domain/IScanRepository";
import { SequelizeScanRepository } from "../../scan/infrastructure/SequelizeScanRepository";

export class GetModelInsightKPIUseCase {
    private scanRepository: IScanRepository;

    constructor(scanRepository: IScanRepository = new SequelizeScanRepository()) {
        this.scanRepository = scanRepository;
    }

    async execute() {
        const thirtyDaysAgo = dayjs(getNowIndonesiaTime()).subtract(30, 'day').toDate();

        const averageAccuracy = await this.scanRepository.aggregate('confidence', 'avg', {
            where: {
                createdAt: { [Op.gte]: thirtyDaysAgo }
            }
        });

        const averageInference = await this.scanRepository.aggregate('inference_time', 'avg', {
            where: {
                createdAt: { [Op.gte]: thirtyDaysAgo }
            }
        });

        const totalScan = await this.scanRepository.count({
            where: {
                createdAt: { [Op.gte]: thirtyDaysAgo }
            }
        });

        const unConfidentScanCount = await this.scanRepository.count({
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
