import { Plan } from "../../../models";

export interface CreatePlanInput {
    name: string;
    price: number;
    scan_quota: number;
    duration_days: number;
}

export class CreatePlanUseCase {
    async execute(payload: CreatePlanInput) {
        const newPlan = await Plan.create(payload);
        return newPlan.toJSON();
    }
}
