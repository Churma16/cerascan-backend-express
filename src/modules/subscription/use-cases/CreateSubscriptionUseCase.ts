import { Transaction } from "sequelize";
import { GetPlanByIdUseCase } from "../../plan/use-cases/GetPlanByIdUseCase";
import { ISubscriptionRepository } from "../domain/ISubscriptionRepository";
import { SequelizeSubscriptionRepository } from "../infrastructure/SequelizeSubscriptionRepository";

export interface SubscriptionPayload {
    user_id: number;
    plan_id: number;
    status: 'active' | 'expired' | 'canceled';
    start_date: Date;
    end_date: Date;
    acquisition_method: string;
    note: string | undefined;
}

export class CreateSubscriptionUseCase {
    private subscriptionRepository: ISubscriptionRepository;

    constructor(subscriptionRepository: ISubscriptionRepository = new SequelizeSubscriptionRepository()) {
        this.subscriptionRepository = subscriptionRepository;
    }

    async execute(
        userId: number,
        planId: number,
        status: SubscriptionPayload["status"] = 'active',
        acquisitionMethod: string = 'midtrans_payment',
        note?: string,
        t?: Transaction
    ) {
        const getPlanByIdUseCase = new GetPlanByIdUseCase();
        const plan = await getPlanByIdUseCase.execute(planId);
        if (!plan) {
            throw new Error(`Plan dengan ID ${planId} tidak ditemukan`);
        }

        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + plan.duration_days);

        const payload: SubscriptionPayload = {
            user_id: userId,
            plan_id: planId,
            status: status,
            start_date: startDate,
            end_date: endDate,
            acquisition_method: acquisitionMethod,
            note: note
        };

        const newSubscription = await this.subscriptionRepository.create(payload, t);

        return newSubscription.toJSON();
    }
}
