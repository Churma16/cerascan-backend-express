import dayjs from "dayjs";
import { getNowIndonesiaTime } from "../../../utils/time.helper";
import { Scan } from "../../../models";
import { col, fn, Op } from "sequelize";

export class GetPredictionDistributionUseCase {
    async execute() {
        const thirtyDaysAgo = dayjs(getNowIndonesiaTime()).subtract(30, 'day').toDate();

        const scanDistributionRaw = await Scan.findAll({
            attributes: [
                'prediction',
                [fn('COUNT', col('id')), 'total']
            ],
            where: {
                createdAt: { [Op.gte]: thirtyDaysAgo }
            },
            group: ['prediction']
        });

        const predictionKeyArray = ['Crack', 'Normal', 'Scratch', 'Stain'];
        const scanDistribution: any[] = [];

        predictionKeyArray.forEach((predictionKey) => {
            const matchingDistribution = scanDistributionRaw.find(
                (item: any) => String(item.dataValues.prediction).toLowerCase() === predictionKey.toLowerCase()
            );

            const totalCount = matchingDistribution
                ? Number((matchingDistribution as any).dataValues.total)
                : 0;

            scanDistribution.push({
                prediction: predictionKey,
                total: totalCount
            });
        });

        const normalData = scanDistribution.find(item => item.prediction === 'Normal');
        const defectData = scanDistribution.filter(item => item.prediction !== 'Normal');

        defectData.sort((a, b) => b.total - a.total);

        const finalDistribution = normalData ? [normalData, ...defectData] : defectData;

        return finalDistribution;
    }
}
