import { Transaction, FindOptions } from "sequelize";
import { User, Plan } from "../models";
import { UserAttributes } from "../models/user.model";

export class UserRepository {
    async findById(id: number, transaction?: Transaction): Promise<User | null> {
        return await User.findOne({
            where: { id },
            attributes: { exclude: ["password"] },
            include: [{
                model: Plan,
                as: "active_plan"
            }],
            transaction
        });
    }

    async findByPk(id: number, transaction?: Transaction): Promise<User | null> {
        return await User.findByPk(id, { transaction });
    }

    async findByEmail(email: string, transaction?: Transaction): Promise<User | null> {
        return await User.findOne({
            where: { email },
            transaction
        });
    }

    async findAll(transaction?: Transaction): Promise<User[]> {
        return await User.findAll({
            attributes: { exclude: ["password"] },
            include: [{
                model: Plan,
                as: "active_plan"
            }],
            transaction
        });
    }

    async create(payload: Partial<UserAttributes>, transaction?: Transaction): Promise<User> {
        return await User.create(payload as any, { transaction });
    }

    async update(id: number, payload: Partial<UserAttributes>, transaction?: Transaction): Promise<number> {
        const [affectedCount] = await User.update(payload, {
            where: { id },
            transaction
        });
        return affectedCount;
    }

    async destroy(id: number, transaction?: Transaction): Promise<boolean> {
        const targetUser = await User.findByPk(id, { transaction });
        if (targetUser) {
            await targetUser.destroy({ transaction });
            return true;
        }
        return false;
    }
}

export const userRepository = new UserRepository();
