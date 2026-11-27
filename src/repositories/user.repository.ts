import { Transaction, FindOptions, CreationAttributes, Op } from "sequelize";
import { User, Plan } from "../models";

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

    async findByIds(ids: number[], transaction?: Transaction): Promise<User[]> {
        return await User.findAll({
            where: { id: { [Op.in]: ids } },
            attributes: ["id", "full_name", "email"],
            transaction
        });
    }

    async create(payload: CreationAttributes<User>, transaction?: Transaction): Promise<User> {
        return await User.create(payload as any, { transaction });
    }

    async save(user: User, transaction?: Transaction): Promise<User> {
        return await user.save({ transaction });
    }

    async update(id: number, payload: Partial<CreationAttributes<User>>, transaction?: Transaction): Promise<number> {
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

    async count(options?: any): Promise<number> {
        return (await (User as any).count(options)) as number;
    }
}

export const userRepository = new UserRepository();
