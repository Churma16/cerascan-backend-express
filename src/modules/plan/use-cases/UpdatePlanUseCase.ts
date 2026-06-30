import { Plan } from "../../../models";
import { CreatePlanInput } from "./CreatePlanUseCase";

export class UpdatePlanUseCase {
    async execute(id: number, payload: Partial<CreatePlanInput>) {
        const plan = await Plan.findByPk(id);
        if (!plan) {
            throw new Error(`Plan dengan ID ${id} tidak ditemukan`);
        }
        await plan.update(payload);
        return plan.toJSON();
    }
}
