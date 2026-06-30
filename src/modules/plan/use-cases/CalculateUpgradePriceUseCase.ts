import { Subscription } from "../../../models";
import { calculateRemainingDays, calculateResidualValue, calculateAdjustedPrice } from "../domain/plan.domain";
import { IPlanRepository } from "../domain/IPlanRepository";
import { SequelizePlanRepository } from "../infrastructure/SequelizePlanRepository";

export class CalculateUpgradePriceUseCase {
    private planRepository: IPlanRepository;

    constructor(planRepository: IPlanRepository = new SequelizePlanRepository()) {
        this.planRepository = planRepository;
    }

    async execute(userId: number, newPlanId: number) {
        const activeSub = await Subscription.findOne({
            where: {
                user_id: userId,
                status: 'active'
            },
            include: ['plan']
        });

        const newPlan = await this.planRepository.findByPk(newPlanId);
        if (!newPlan) {
            throw new Error(`Plan tujuan dengan ID ${newPlanId} tidak ditemukan`);
        }

        if (!activeSub || !activeSub.plan || activeSub.plan.price === 0) {
            return {
                original_price: newPlan.price,
                discount_prorata: 0,
                final_price: newPlan.price
            };
        }

        const oldPlan = activeSub.plan;
        const remainingDays = calculateRemainingDays(new Date(activeSub.end_date));

        if (remainingDays <= 0) {
            return {
                original_price: newPlan.price,
                discount_prorata: 0,
                final_price: newPlan.price
            };
        }

        const residualValue = calculateResidualValue(oldPlan.price, oldPlan.duration_days, remainingDays);
        const finalPrice = calculateAdjustedPrice(newPlan.price, residualValue);

        return {
            original_price: newPlan.price,
            discount_prorata: residualValue,
            final_price: finalPrice
        };
    }
}
