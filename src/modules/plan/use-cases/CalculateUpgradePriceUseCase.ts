import { Plan, Subscription } from "../../../models";
import { calculateRemainingDays, calculateResidualValue, calculateAdjustedPrice } from "../domain/plan.domain";

export class CalculateUpgradePriceUseCase {
    async execute(userId: number, newPlanId: number) {
        const activeSub = await Subscription.findOne({
            where: {
                user_id: userId,
                status: 'active'
            },
            include: ['plan']
        });

        const newPlan = await Plan.findByPk(newPlanId);
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
