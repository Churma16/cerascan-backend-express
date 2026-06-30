import { literal, Op } from "sequelize";
import { IPaymentRepository } from "../domain/IPaymentRepository";
import { SequelizePaymentRepository } from "../infrastructure/SequelizePaymentRepository";

export class GetPaymentKpiUseCase {
    private paymentRepository: IPaymentRepository;

    constructor(paymentRepository: IPaymentRepository = new SequelizePaymentRepository()) {
        this.paymentRepository = paymentRepository;
    }

    async execute() {
        const now = new Date();

        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const thisMonthKpi: any = await this.paymentRepository.findAll({
            attributes: [
                [
                    literal(`SUM(CASE WHEN status IN ('settlement', 'capture', 'success') THEN amount ELSE 0 END)`),
                    'total_revenue'
                ],
                [
                    literal(`SUM(CASE WHEN status IN ('settlement', 'capture', 'success') THEN 1 ELSE 0 END)`),
                    'successful_trx'
                ],
                [
                    literal(`SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)`),
                    'pending_trx'
                ]
            ],
            where: {
                createdAt: {
                    [Op.gte]: startOfThisMonth
                }
            },
            raw: true
        });

        const lastMonthKpi: any = await this.paymentRepository.findAll({
            attributes: [
                [
                    literal(`SUM(CASE WHEN status IN ('settlement', 'capture', 'success') THEN amount ELSE 0 END)`),
                    'total_revenue'
                ]
            ],
            where: {
                createdAt: {
                    [Op.gte]: startOfLastMonth,
                    [Op.lt]: startOfThisMonth
                }
            },
            raw: true
        });

        const currentRevenue = Number(thisMonthKpi[0]?.total_revenue || 0);
        const lastRevenue = Number(lastMonthKpi[0]?.total_revenue || 0);

        const successfulTrx = Number(thisMonthKpi[0]?.successful_trx || 0);
        const pendingTrx = Number(thisMonthKpi[0]?.pending_trx || 0);

        let growthPercentage = 0;
        if (lastRevenue > 0) {
            growthPercentage = ((currentRevenue - lastRevenue) / lastRevenue) * 100;
        } else if (currentRevenue > 0) {
            growthPercentage = 100;
        }

        return {
            revenue: {
                total: currentRevenue,
                growth_percentage: parseFloat(growthPercentage.toFixed(1)),
                is_positive: growthPercentage >= 0
            },
            payments: {
                successful: successfulTrx,
                pending: pendingTrx
            }
        };
    }
}
