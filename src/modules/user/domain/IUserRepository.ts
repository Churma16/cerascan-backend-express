import { Transaction } from "sequelize";
import User, { UserAttributes } from "../../../models/user.model";

export interface IUserRepository {
    findById(id: number, transaction?: Transaction): Promise<User | null>;
    findByPk(id: number, transaction?: Transaction): Promise<User | null>;
    findByEmail(email: string, transaction?: Transaction): Promise<User | null>;
    findAll(transaction?: Transaction): Promise<User[]>;
    create(payload: Partial<UserAttributes>, transaction?: Transaction): Promise<User>;
    save(user: User, transaction?: Transaction): Promise<User>;
    update(id: number, payload: Partial<UserAttributes>, transaction?: Transaction): Promise<number>;
    destroy(id: number, transaction?: Transaction): Promise<void>;
    bulkUpdatePlan(userIds: number[], planId: number, transaction?: Transaction): Promise<number>;
    findByIds(ids: number[], transaction?: Transaction): Promise<User[]>;
    count(options?: { where?: any; transaction?: Transaction }): Promise<number>;
}
