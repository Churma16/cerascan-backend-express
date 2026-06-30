import { Transaction } from "sequelize";
import Payment, { PaymentAttributes } from "../../../models/payment.model";
import { IPaymentRepository } from "../domain/IPaymentRepository";

export class SequelizePaymentRepository implements IPaymentRepository {
    async findById(id: number, transaction?: Transaction): Promise<Payment | null> {
        return await Payment.findByPk(id, { transaction });
    }

    async findByPk(id: number, transaction?: Transaction): Promise<Payment | null> {
        return await Payment.findByPk(id, { transaction });
    }

    async findOne(options: { where: any; transaction?: Transaction }): Promise<Payment | null> {
        return await Payment.findOne(options);
    }

    async findAll(options?: { where?: any; include?: any; order?: any; attributes?: any; raw?: boolean; transaction?: Transaction }): Promise<any[]> {
        return await Payment.findAll(options);
    }

    async create(payload: Partial<PaymentAttributes>, transaction?: Transaction): Promise<Payment> {
        return await Payment.create(payload as any, { transaction });
    }

    async update(id: number, payload: Partial<PaymentAttributes>, transaction?: Transaction): Promise<number> {
        const [affectedCount] = await Payment.update(payload, {
            where: { id },
            transaction
        });
        return affectedCount;
    }

    async destroy(id: number, transaction?: Transaction): Promise<void> {
        const payment = await Payment.findByPk(id, { transaction });
        if (payment) {
            await payment.destroy({ transaction });
        }
    }
}
