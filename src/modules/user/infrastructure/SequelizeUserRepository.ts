import { Transaction, Op } from "sequelize";
import User, { UserAttributes } from "../../../models/user.model";
import { Plan } from "../../../models";
import { IUserRepository } from "../domain/IUserRepository";

export class SequelizeUserRepository implements IUserRepository {
    async findById(id: number, transaction?: Transaction): Promise<User | null> {
        return await User.findOne({
            where: { id },
            attributes: { exclude: ['password'] },
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
            attributes: { exclude: ['password'] },
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

    async save(user: User, transaction?: Transaction): Promise<User> {
        return await user.save({ transaction });
    }

    async update(id: number, payload: Partial<UserAttributes>, transaction?: Transaction): Promise<number> {
        const [affectedCount] = await User.update(payload, {
            where: { id },
            transaction
        });
        return affectedCount;
    }

    async destroy(id: number, transaction?: Transaction): Promise<void> {
        const user = await User.findByPk(id, { transaction });
        if (user) {
            await user.destroy({ transaction });
        }
    }

    async bulkUpdatePlan(userIds: number[], planId: number, transaction?: Transaction): Promise<number> {
        const [affectedCount] = await User.update(
            { plan_id: planId },
            {
                where: { id: { [Op.in]: userIds } },
                transaction
            }
        );
        return affectedCount;
    }

    async findByIds(ids: number[], transaction?: Transaction): Promise<User[]> {
        return await User.findAll({
            where: { id: { [Op.in]: ids } },
            attributes: ['id', 'full_name', 'email'],
            transaction
        });
    }

    async count(options?: { where?: any; transaction?: Transaction }): Promise<number> {
        return await User.count(options);
    }
}
