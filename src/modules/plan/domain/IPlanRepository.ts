import { Transaction } from "sequelize";
import Plan, { PlanAttributes } from "../../../models/plan.model";

export interface IPlanRepository {
    findById(id: number, transaction?: Transaction): Promise<Plan | null>;
    findByPk(id: number, transaction?: Transaction): Promise<Plan | null>;
    findAll(transaction?: Transaction): Promise<Plan[]>;
    create(payload: Partial<PlanAttributes>, transaction?: Transaction): Promise<Plan>;
    update(id: number, payload: Partial<PlanAttributes>, transaction?: Transaction): Promise<number>;
    destroy(id: number, transaction?: Transaction): Promise<void>;
}
