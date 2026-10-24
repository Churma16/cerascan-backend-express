import dayjs from "dayjs";
import { getNowIndonesiaTime } from "../../utils/time.helper";
import { col, fn, literal, Op } from "sequelize";
import { scanRepository } from "../../repositories/scan.repository";

export class ModelInsightService {
    static async getModelInsightKPI() {
        const thirtyDaysAgo = dayjs(getNowIndonesiaTime()).subtract(30, "day").toDate();

        const averageAccuracy = await scanRepository.aggregate("confidence", "avg", {
            where: {
                createdAt: { [Op.gte]: thirtyDaysAgo }
            }
        });

        const averageInference = await scanRepository.aggregate("inference_time", "avg", {
            where: {
                createdAt: { [Op.gte]: thirtyDaysAgo }
            }
        });

        const totalScan = await scanRepository.count({
            where: {
                createdAt: { [Op.gte]: thirtyDaysAgo }
            }
        });

        const unConfidentScanCount = await scanRepository.count({
            where: {
                confidence: { [Op.lt]: 80 },
                createdAt: { [Op.gte]: thirtyDaysAgo }
            }
        });

        return {
            averageInference: averageInference,
            averageAccuracy: averageAccuracy,
            totalScan: totalScan,
            unConfidentScanCount: unConfidentScanCount
        };
    }

    static async getPredictionDistribution() {
        const thirtyDaysAgo = dayjs(getNowIndonesiaTime()).subtract(30, "day").toDate();

        const scanDistributionRaw = await scanRepository.findAll({
            attributes: [
                "prediction",
                [fn("COUNT", col("id")), "total"]
            ],
            where: {
                createdAt: { [Op.gte]: thirtyDaysAgo }
            },
            group: ["prediction"]
        });

        const predictionKeyArray = ["Crack", "Normal", "Scratch", "Stain"];
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

        const normalData = scanDistribution.find(item => item.prediction === "Normal");
        const defectData = scanDistribution.filter(item => item.prediction !== "Normal");

        defectData.sort((a, b) => b.total - a.total);
        return normalData ? [normalData, ...defectData] : defectData;
    }

    static async getConfidenceDistribution() {
        const thirtyDaysAgo = dayjs(getNowIndonesiaTime()).subtract(30, "day").toDate();

        const confidenceRaw = await scanRepository.findAll({
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
                    "confidenceRanges"
                ],
                [fn("COUNT", col("id")), "total"]
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

        const confidenceRanges = ["<60%", "60-80%", "80-90%", "90-95%", ">95%"];
        const confidenceDistribution: any[] = [];

        confidenceRanges.forEach((confidenceRangesKey) => {
            const matchingData = confidenceRaw.find(
                (item: any) => String(item.getDataValue("confidenceRanges" as any)) === confidenceRangesKey
            );

            const totalCount = matchingData
                ? Number(matchingData.getDataValue("total" as any))
                : 0;

            confidenceDistribution.push({
                confidenceRanges: confidenceRangesKey,
                total: totalCount
            });
        });

        return confidenceDistribution;
    }
}
