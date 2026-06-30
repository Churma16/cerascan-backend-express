import { Transaction } from "sequelize";
import Payment, { PaymentAttributes } from "../../../models/payment.model";

export interface IPaymentRepository {
    findById(id: number, transaction?: Transaction): Promise<Payment | null>;
    findByPk(id: number, transaction?: Transaction): Promise<Payment | null>;
    findOne(options: { where: any; transaction?: Transaction }): Promise<Payment | null>;
    findAll(options?: { where?: any; include?: any; order?: any; attributes?: any; raw?: boolean; transaction?: Transaction }): Promise<any[]>;
    create(payload: Partial<PaymentAttributes>, transaction?: Transaction): Promise<Payment>;
    update(id: number, payload: Partial<PaymentAttributes>, transaction?: Transaction): Promise<number>;
    destroy(id: number, transaction?: Transaction): Promise<void>;
}
