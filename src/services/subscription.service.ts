import { subscriptionRepository, SubscriptionRepository } from "../repositories/subscription.repository";
import { planRepository, PlanRepository } from "../repositories/plan.repository";
import { UserPlanLifecycleService } from "./userPlanLifecycle.service";
import { Subscription } from "../models";
import { SubscriptionAttributes } from "../models/subscription.model";

export class SubscriptionService {
    private subRepo: SubscriptionRepository;
    private planRepo: PlanRepository;

    constructor(
        subRepo: SubscriptionRepository = subscriptionRepository,
        planRepo: PlanRepository = planRepository
    ) {
        this.subRepo = subRepo;
        this.planRepo = planRepo;
    }

    async createSubscription(
        userId: number,
        planId: number,
        status: "active" | "expired" | "canceled" = "active",
        acquisitionMethod: string = "midtrans_payment",
        note?: string
    ): Promise<Subscription> {
        const plan = await this.planRepo.findByPk(planId);
        if (!plan) {
            throw new Error(`Plan dengan ID ${planId} tidak ditemukan`);
        }

        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + (plan.duration_days || 30));

        return await this.subRepo.create({
            user_id: userId,
            plan_id: planId,
            start_date: startDate,
            end_date: endDate,
            status,
            acquisition_method: acquisitionMethod,
            note
        });
    }

    async getAllSubscriptions(): Promise<Subscription[]> {
        return await this.subRepo.findAll({
            include: ["plan", "user"]
        });
    }

    async getSubscriptionById(id: number): Promise<Subscription> {
        const subscription = await this.subRepo.findById(id);
        if (!subscription) {
            throw new Error("Subscription tidak ditemukan");
        }
        return subscription;
    }

    async getSubscriptionsByUserId(userId: number): Promise<Subscription[]> {
        return await this.subRepo.findByUserId(userId);
    }

    async getActiveSubscriptionByUserId(userId: number): Promise<Subscription | null> {
        return await this.subRepo.findActiveByUserId(userId);
    }

    async updateSubscription(id: number, payload: Partial<SubscriptionAttributes>): Promise<Subscription> {
        const subscription = await this.subRepo.findById(id);
        if (!subscription) {
            throw new Error("Subscription tidak ditemukan");
        }

        await this.subRepo.update(payload, { where: { id } });
        const updated = await this.subRepo.findById(id);
        return updated!;
    }

    async deleteSubscription(id: number): Promise<{ message: string }> {
        const isDeleted = await this.subRepo.destroy(id);
        if (!isDeleted) {
            throw new Error("Subscription tidak ditemukan");
        }
        return { message: `Subscription dengan ID ${id} berhasil dihapus` };
    }

    async giveSubscription(
        userId: number,
        planId: number,
        acquisitionMethod: string = "admin_grant",
        note: string = "Diberikan langsung oleh Administrator"
    ) {
        return await UserPlanLifecycleService.assignPlan(userId, planId, {
            acquisitionMethod,
            note
        });
    }
}

export const subscriptionService = new SubscriptionService();
