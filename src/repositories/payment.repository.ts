import { Transaction, FindOptions, CreationAttributes } from "sequelize";
import { Payment } from "../models";

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
}

export const paymentRepository = new PaymentRepository();
