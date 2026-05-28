import {Subscription} from "../../models";

export interface SubscriptionPayload {
    user_id: number;
    plan_id: number;
    status: 'active' | 'expired' | 'canceled';
    start_date: Date;
    end_date: Date;
}

export class SubscriptionService {
    static async createSubscription(payload: SubscriptionPayload) {
        const newSubscription = await Subscription.create(payload);
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

