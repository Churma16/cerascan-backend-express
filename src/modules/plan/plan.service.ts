import {Plan} from "../../models";

export interface PlanPayload {
    name: string;
    price: number;
    scan_quota: number;
    duration_days: number;
}

export class PlanService {
    static async createPlan(payload: PlanPayload) {
        const newPlan = await Plan.create(payload);
        return newPlan.toJSON()
    }

    static async getAllPlans() {
        const plans = await Plan.findAll();
        return plans.map(plan => plan.toJSON());
    }

    static async getPlanById(id: number) {
        const plan = await Plan.findByPk(id);
        if (!plan) {
            throw new Error(`Plan dengan ID ${id} tidak ditemukan`);
        }
        return plan.toJSON();
    }

    static async updatePlan(id: number, payload: Partial<PlanPayload>) {
        const plan = await Plan.findByPk(id);
        if (!plan) {
            throw new Error(`Plan dengan ID ${id} tidak ditemukan`);
        }
        await plan.update(payload);
        return plan.toJSON();
    }

    static async deletePlan(id: number) {
        const plan = await Plan.findByPk(id);
        if (!plan) {
            throw new Error(`Plan dengan ID ${id} tidak ditemukan`);
        }
        await plan.destroy();
        return {message: `Plan dengan ID ${id} berhasil dihapus`};
    }

}