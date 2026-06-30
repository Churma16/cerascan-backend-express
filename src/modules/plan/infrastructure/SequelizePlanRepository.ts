import { Transaction } from "sequelize";
import Plan, { PlanAttributes } from "../../../models/plan.model";
import { IPlanRepository } from "../domain/IPlanRepository";

export class SequelizePlanRepository implements IPlanRepository {
    async findById(id: number, transaction?: Transaction): Promise<Plan | null> {
        return await Plan.findByPk(id, { transaction });
    }

    async findByPk(id: number, transaction?: Transaction): Promise<Plan | null> {
        return await Plan.findByPk(id, { transaction });
    }

    async findAll(transaction?: Transaction): Promise<Plan[]> {
        return await Plan.findAll({ transaction });
    }

    async create(payload: Partial<PlanAttributes>, transaction?: Transaction): Promise<Plan> {
        return await Plan.create(payload as any, { transaction });
    }

    async update(id: number, payload: Partial<PlanAttributes>, transaction?: Transaction): Promise<number> {
        const [affectedCount] = await Plan.update(payload, {
            where: { id },
            transaction
        });
        return affectedCount;
    }

    async destroy(id: number, transaction?: Transaction): Promise<void> {
        const plan = await Plan.findByPk(id, { transaction });
        if (plan) {
            await plan.destroy({ transaction });
        }
    }
}
