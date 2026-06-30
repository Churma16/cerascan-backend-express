import { Plan } from "../../../models";

export class GetAllPlansUseCase {
    async execute() {
        const plans = await Plan.findAll();
        return plans.map(plan => plan.toJSON());
    }
}
