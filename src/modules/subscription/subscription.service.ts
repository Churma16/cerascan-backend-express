import {Subscription} from "../../models";
import {PlanService} from "../plan/plan.service";
import {Transaction} from "sequelize";

export interface SubscriptionPayload {
    user_id: number;
    plan_id: number;
    status: 'active' | 'expired' | 'canceled';
    start_date: Date;
    end_date: Date
}

export class SubscriptionService {
    static async createSubscription(
        userId: number,
        planId: number,
        status: SubscriptionPayload["status"] = 'active',
        t?: Transaction // Parameter opsional
    ) {

        const plan = await PlanService.getPlanById(planId);
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
            end_date: endDate
        };

        // 3. Sisipkan transaksi ke dalam opsi Sequelize
        const newSubscription = await Subscription.create(payload as any, {
            transaction: t
        });

        return newSubscription.toJSON();
    }

    static async getAllSubscriptions() {
        const subscriptions = await Subscription.findAll();
        return subscriptions.map(subscription => subscription.toJSON());
    }

    static async getSubscriptionById(id: number) {
        const subscription = await Subscription.findByPk(id);
        if (!subscription) {
            throw new Error(`Subscription dengan ID ${id} tidak ditemukan`);
        }
        return subscription.toJSON();
    }

    static async getSubscriptionByUserId(user_id: number) {
        const subscriptions = await Subscription.findAll({where: {user_id}});
        return subscriptions.map(subscription => subscription.toJSON());
    }

    static async updateSubscription(id: number, payload: Partial<SubscriptionPayload>) {
        const subscription = await Subscription.findByPk(id);
        if (!subscription) {
            throw new Error(`Subscription dengan ID ${id} tidak ditemukan`);
        }
        await subscription.update(payload);
        return subscription.toJSON();
    }

    static async deleteSubscription(id: number) {
        const subscription = await Subscription.findByPk(id);
        if (!subscription) {
            throw new Error(`Subscription dengan ID ${id} tidak ditemukan`);
        }
        await subscription.destroy();
        return {message: `Subscription dengan ID ${id} berhasil dihapus`};
    }
}

