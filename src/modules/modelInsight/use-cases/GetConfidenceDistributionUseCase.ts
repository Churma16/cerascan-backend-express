import dayjs from "dayjs";
import { getNowIndonesiaTime } from "../../../utils/time.helper";
import { col, fn, literal, Op } from "sequelize";
import { IScanRepository } from "../../scan/domain/IScanRepository";
import { SequelizeScanRepository } from "../../scan/infrastructure/SequelizeScanRepository";

export class GetConfidenceDistributionUseCase {
    private scanRepository: IScanRepository;

    constructor(scanRepository: IScanRepository = new SequelizeScanRepository()) {
        this.scanRepository = scanRepository;
    }

    async execute() {
        const thirtyDaysAgo = dayjs(getNowIndonesiaTime()).subtract(30, 'day').toDate();

        const confidenceRaw = await this.scanRepository.findAll({
            attributes: [
                [
                    literal(`
                        CASE 
                            WHEN confidence < 60 THEN '<60%'
                            WHEN confidence >= 60 AND confidence < 80 THEN '60-80%'
                            WHEN confidence >= 80 AND confidence < 90 THEN '80-90%'
                            WHEN confidence >= 90 AND confidence < 95 THEN '90-95%'
                            ELSE '>95%'
                        END
                    `),
                    'confidenceRanges'
                ],
                [fn('COUNT', col('id')), 'total']
            ],
            where: {
                createdAt: { [Op.gte]: thirtyDaysAgo }
            },
            group: [
                literal(`
                    CASE 
                        WHEN confidence < 60 THEN '<60%'
                        WHEN confidence >= 60 AND confidence < 80 THEN '60-80%'
                        WHEN confidence >= 80 AND confidence < 90 THEN '80-90%'
                        WHEN confidence >= 90 AND confidence < 95 THEN '90-95%'
                        ELSE '>95%'
                    END
                `) as any
            ]
        });

        const confidenceRanges = ['<60%', '60-80%', '80-90%', '90-95%', '>95%'];
        const confidenceDistribution: any[] = [];

        confidenceRanges.forEach((confidenceRangesKey) => {
            const matchingData = confidenceRaw.find(
                (item: any) => String(item.getDataValue('confidenceRanges' as any)) === confidenceRangesKey
            );

            const totalCount = matchingData
                ? Number(matchingData.getDataValue('total' as any))
                : 0;

            confidenceDistribution.push({
                confidenceRanges: confidenceRangesKey,
                total: totalCount
            });
        });

        return confidenceDistribution;
    }
}
