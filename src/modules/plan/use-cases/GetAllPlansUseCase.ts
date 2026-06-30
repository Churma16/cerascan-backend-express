import { IPlanRepository } from "../domain/IPlanRepository";
import { SequelizePlanRepository } from "../infrastructure/SequelizePlanRepository";

export class GetAllPlansUseCase {
    private planRepository: IPlanRepository;

    constructor(planRepository: IPlanRepository = new SequelizePlanRepository()) {
        this.planRepository = planRepository;
    }

    async execute() {
        const plans = await this.planRepository.findAll();
        return plans.map(plan => plan.toJSON());
    }
}
