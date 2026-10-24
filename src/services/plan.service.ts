import { Plan, Subscription } from "../models";
import { planRepository, PlanRepository } from "../repositories/plan.repository";
import { PlanAttributes } from "../models/plan.model";

export const calculateRemainingDays = (endDate: Date, today: Date = new Date()): number => {
    const diffTime = endDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const calculateResidualValue = (oldPrice: number, durationDays: number, remainingDays: number): number => {
    if (remainingDays <= 0 || durationDays <= 0) return 0;
    const oldDailyRate = oldPrice / durationDays;
    return Math.floor(remainingDays * oldDailyRate);
};

export const calculateAdjustedPrice = (newPrice: number, residualValue: number): number => {
    let finalPrice = newPrice - residualValue;
    if (finalPrice < 1000) {
        finalPrice = 1000;
    }
    return finalPrice;
};

export class PlanService {
    private planRepo: PlanRepository;

    constructor(planRepo: PlanRepository = planRepository) {
        this.planRepo = planRepo;
    }

    async createPlan(payload: { name: string; price: number; scan_quota: number; duration_days: number }): Promise<PlanAttributes> {
        const newPlan = await this.planRepo.create(payload);
        return newPlan.toJSON();
    }

    async getAllPlans(): Promise<PlanAttributes[]> {
        const plans = await this.planRepo.findAll();
        return plans.map((plan) => plan.toJSON());
    }

    async getPlanById(id: number): Promise<PlanAttributes> {
        const plan = await this.planRepo.findByPk(id);
        if (!plan) {
            throw new Error("Plan tidak ditemukan");
        }
        return plan.toJSON();
    }

    async updatePlan(id: number, payload: Partial<PlanAttributes>): Promise<PlanAttributes | null> {
        const plan = await this.planRepo.findByPk(id);
        if (!plan) {
            throw new Error("Plan tidak ditemukan");
        }
        await this.planRepo.update(id, payload);
        const updatedPlan = await this.planRepo.findByPk(id);
        return updatedPlan ? updatedPlan.toJSON() : null;
    }

    async deletePlan(id: number): Promise<{ message: string }> {
        const isDeleted = await this.planRepo.destroy(id);
        if (!isDeleted) {
            throw new Error("Plan tidak ditemukan");
        }
        return { message: `Plan dengan ID ${id} berhasil dihapus` };
    }

    async calculateUpgradePrice(userId: number, newPlanId: number) {
        const activeSubscription = await Subscription.findOne({
            where: {
                user_id: userId,
                status: "active"
            },
            include: ["plan"]
        });

        const targetPlan = await this.planRepo.findByPk(newPlanId);
        if (!targetPlan) {
            throw new Error(`Plan tujuan dengan ID ${newPlanId} tidak ditemukan`);
        }

        if (!activeSubscription || !activeSubscription.plan || activeSubscription.plan.price === 0) {
            return {
                original_price: targetPlan.price,
                discount_prorata: 0,
                final_price: targetPlan.price
            };
        }

        const currentPlan = activeSubscription.plan;
        const remainingDays = calculateRemainingDays(new Date(activeSubscription.end_date));

        if (remainingDays <= 0) {
            return {
                original_price: targetPlan.price,
                discount_prorata: 0,
                final_price: targetPlan.price
            };
        }

        const residualValue = calculateResidualValue(currentPlan.price, currentPlan.duration_days, remainingDays);
        const finalPrice = calculateAdjustedPrice(targetPlan.price, residualValue);

        return {
            original_price: targetPlan.price,
            discount_prorata: residualValue,
            final_price: finalPrice
        };
    }
}

export const planService = new PlanService();
