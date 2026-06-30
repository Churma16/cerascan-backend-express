import { Plan } from "../../../models";

export class DeletePlanUseCase {
    async execute(id: number) {
        const plan = await Plan.findByPk(id);
        if (!plan) {
            throw new Error(`Plan dengan ID ${id} tidak ditemukan`);
        }
        await plan.destroy();
        return { message: `Plan dengan ID ${id} berhasil dihapus` };
    }
}
