import { IPlanRepository } from "../domain/IPlanRepository";
import { SequelizePlanRepository } from "../infrastructure/SequelizePlanRepository";

export interface CreatePlanInput {
    name: string;
    price: number;
    scan_quota: number;
    duration_days: number;
}

export class CreatePlanUseCase {
    private planRepository: IPlanRepository;

    constructor(planRepository: IPlanRepository = new SequelizePlanRepository()) {
        this.planRepository = planRepository;
    }

    async execute(payload: CreatePlanInput) {
        const newPlan = await this.planRepository.create(payload);
        return newPlan.toJSON();
    }
}
