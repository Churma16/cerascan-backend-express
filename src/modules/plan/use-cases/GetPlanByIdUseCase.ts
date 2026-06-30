import { IPlanRepository } from "../domain/IPlanRepository";
import { SequelizePlanRepository } from "../infrastructure/SequelizePlanRepository";

export class GetPlanByIdUseCase {
    private planRepository: IPlanRepository;

    constructor(planRepository: IPlanRepository = new SequelizePlanRepository()) {
        this.planRepository = planRepository;
    }

    async execute(id: number) {
        const plan = await this.planRepository.findByPk(id);
        if (!plan) {
            throw new Error(`Plan dengan ID ${id} tidak ditemukan`);
        }
        return plan.toJSON();
    }
}
