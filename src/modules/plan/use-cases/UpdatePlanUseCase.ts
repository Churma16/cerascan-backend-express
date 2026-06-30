import { IPlanRepository } from "../domain/IPlanRepository";
import { SequelizePlanRepository } from "../infrastructure/SequelizePlanRepository";
import { CreatePlanInput } from "./CreatePlanUseCase";

export class UpdatePlanUseCase {
    private planRepository: IPlanRepository;

    constructor(planRepository: IPlanRepository = new SequelizePlanRepository()) {
        this.planRepository = planRepository;
    }

    async execute(id: number, payload: Partial<CreatePlanInput>) {
        const plan = await this.planRepository.findByPk(id);
        if (!plan) {
            throw new Error(`Plan dengan ID ${id} tidak ditemukan`);
        }
        await this.planRepository.update(id, payload);
        
        const updatedPlan = await this.planRepository.findByPk(id);
        return updatedPlan ? updatedPlan.toJSON() : plan.toJSON();
    }
}
