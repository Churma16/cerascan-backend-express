import { Plan } from "../../../models";

export class GetPlanByIdUseCase {
    async execute(id: number) {
        const plan = await Plan.findByPk(id);
        if (!plan) {
            throw new Error(`Plan dengan ID ${id} tidak ditemukan`);
        }
        return plan.toJSON();
    }
}
