import { SequelizePlanRepository } from "./infrastructure/SequelizePlanRepository";

const planRepository = new SequelizePlanRepository();

export class PlanService {
    static async createPlan(payload: { name: string; price: number; scan_quota: number; duration_days: number }) {
        const newPlan = await planRepository.create(payload);
        return newPlan.toJSON();
    }

    static async getAllPlans() {
        const plans = await planRepository.findAll();
        return plans.map(p => p.toJSON());
    }

    static async getPlanById(id: number) {
        const plan = await planRepository.findByPk(id);
        if (!plan) {
            throw new Error("Plan tidak ditemukan");
        }
        return plan.toJSON();
    }

    static async updatePlan(id: number, payload: any) {
        const plan = await planRepository.findByPk(id);
        if (!plan) {
            throw new Error("Plan tidak ditemukan");
        }
        await planRepository.update(id, payload);
        const updatedPlan = await planRepository.findByPk(id);
        return updatedPlan?.toJSON();
    }

    static async deletePlan(id: number) {
        const plan = await planRepository.findByPk(id);
        if (!plan) {
            throw new Error("Plan tidak ditemukan");
        }
        await planRepository.destroy(id);
        return { message: `Plan dengan ID ${id} berhasil dihapus` };
    }
}
