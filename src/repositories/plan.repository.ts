import { Transaction, FindOptions, CreationAttributes } from "sequelize";
import { Plan } from "../models";

export class PlanRepository {
    async findById(id: number, transaction?: Transaction): Promise<Plan | null> {
        return await Plan.findByPk(id, { transaction });
    }

    async findByPk(id: number, transaction?: Transaction): Promise<Plan | null> {
        return await Plan.findByPk(id, { transaction });
    }

    async findAll(transaction?: Transaction): Promise<Plan[]> {
        return await Plan.findAll({ transaction });
    }

    async create(payload: CreationAttributes<Plan>, transaction?: Transaction): Promise<Plan> {
        return await Plan.create(payload as any, { transaction });
    }

    async update(id: number, payload: Partial<CreationAttributes<Plan>>, transaction?: Transaction): Promise<number> {
        const [affectedCount] = await Plan.update(payload, {
            where: { id },
            transaction
        });
        return affectedCount;
    }

    async destroy(id: number, transaction?: Transaction): Promise<boolean> {
        const targetPlan = await Plan.findByPk(id, { transaction });
        if (targetPlan) {
            await targetPlan.destroy({ transaction });
            return true;
        }
        return false;
    }
}

export const planRepository = new PlanRepository();
