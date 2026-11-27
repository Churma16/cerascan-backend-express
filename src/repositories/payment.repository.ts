import { Transaction, FindOptions, CreationAttributes, Op, literal } from "sequelize";
import { Payment } from "../models";

export interface MonthlyRevenueAggregate {
    total_revenue: number;
    successful_trx: number;
    pending_trx: number;
}

export class PaymentRepository {
    async findById(id: number, transaction?: Transaction): Promise<Payment | null> {
        return await Payment.findByPk(id, { transaction });
    }

    async findByPk(id: number, transaction?: Transaction): Promise<Payment | null> {
        return await Payment.findByPk(id, { transaction });
    }

    async findOne(options: FindOptions): Promise<Payment | null> {
        return await Payment.findOne(options);
    }

    async findAll(options?: FindOptions): Promise<Payment[]> {
        return await Payment.findAll(options);
    }

    async create(payload: CreationAttributes<Payment>, transaction?: Transaction): Promise<Payment> {
        return await Payment.create(payload as any, { transaction });
    }

    async findOrCreate(
        orderId: string,
        defaults: CreationAttributes<Payment>,
        transaction?: Transaction
    ): Promise<[Payment, boolean]> {
        return await Payment.findOrCreate({
            where: { order_id: orderId },
            defaults: defaults as any,
            transaction
        });
    }

    async save(payment: Payment, transaction?: Transaction): Promise<Payment> {
        return await payment.save({ transaction });
    }

    async update(id: number, payload: Partial<CreationAttributes<Payment>>, transaction?: Transaction): Promise<number> {
        const [affectedCount] = await Payment.update(payload, {
            where: { id },
            transaction
        });
        return affectedCount;
    }

    async destroy(id: number, transaction?: Transaction): Promise<boolean> {
        const targetPayment = await Payment.findByPk(id, { transaction });
        if (targetPayment) {
            await targetPayment.destroy({ transaction });
            return true;
        }
        return false;
    }

    async getMonthlyRevenueStats(startDate: Date, endDate?: Date): Promise<MonthlyRevenueAggregate> {
        const where: any = {
            created_at: endDate ? { [Op.gte]: startDate, [Op.lt]: endDate } : { [Op.gte]: startDate }
        };

        const result: any = await Payment.findAll({
            attributes: [
                [
                    literal(`SUM(CASE WHEN status IN ('settlement', 'capture', 'success') THEN amount ELSE 0 END)`),
                    "total_revenue"
                ],
                [
                    literal(`SUM(CASE WHEN status IN ('settlement', 'capture', 'success') THEN 1 ELSE 0 END)`),
                    "successful_trx"
                ],
                [
                    literal(`SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)`),
                    "pending_trx"
                ]
            ],
            where,
            raw: true
        });

        return {
            total_revenue: Number(result[0]?.total_revenue || 0),
            successful_trx: Number(result[0]?.successful_trx || 0),
            pending_trx: Number(result[0]?.pending_trx || 0),
        };
    }
}

export const paymentRepository = new PaymentRepository();
