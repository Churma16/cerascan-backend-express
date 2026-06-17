import {Plan, Subscription, User, UserQuota} from "../../models";
import {PlanService} from "../plan/plan.service";
import {Op, Transaction} from "sequelize";
import {UserQuotaService} from "../user_quota/user_quota.service";

export interface SubscriptionPayload {
    user_id: number;
    plan_id: number;
    status: 'active' | 'expired' | 'canceled';
    start_date: Date;
    end_date: Date
    acquisition_method: string;
    note: string | undefined;
}

export class SubscriptionService {
    static async createSubscription(
        userId: number,
        planId: number,
        status: SubscriptionPayload["status"] = 'active',
        acquisitionMethod: string = 'midtrans_payment'
        , note?: string, t?: Transaction) {

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
            end_date: endDate,
            acquisition_method: acquisitionMethod,
            note: note
        };

        // 3. Sisipkan transaksi ke dalam opsi Sequelize
        const newSubscription = await Subscription.create(payload as any, {
            transaction: t
        });

        return newSubscription.toJSON();
    }

    static async getAllSubscriptions() {
        const subscriptions = await Subscription.findAll({
            where: {status: "active"},
            include: [
                {
                    model: Plan,
                    as: "plan"
                },
                {
                    model: User,
                    as: "user",
                    include: [
                        {
                            model: UserQuota,
                            as: "user_quota"
                        }
                    ]
                }
            ],
        });
        return subscriptions.map(subscription => subscription.toJSON());
    }

    static async getSubscriptionById(id: number) {
        const subscription = await Subscription.findByPk(id);
        if (!subscription) {
            throw new Error(`Subscription dengan ID ${id} tidak ditemukan`);
        }
        return subscription.toJSON();
    }

    static async getSubscriptionByUserId(user_id: number | undefined) {
        const subscriptions = await Subscription.findAll({
            where: {user_id},
            include: [
                {
                    model: Plan,
                    as: 'plan'
                },
                {
                    model: User,
                    as: 'user',
                    include: [
                        {
                            model: UserQuota,
                            as: "user_quota"
                        }
                    ]
                }
            ],
            order: [
                ['createdAt', 'DESC']
            ]
        });
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

    static async getActiveSubscriptionsByUserId(userId: number | undefined) {
        console.log(userId);
        const subsDetail = await Subscription.findOne({
            where: {
                user_id: userId,
                status: 'active'
            },
            include: [
                {
                    model: Plan,
                    as: "plan"
                },
                {
                    model: User,
                    as: "user"
                }
            ],
            order: [
                ['createdAt', 'DESC']
            ]
        })

        if (!subsDetail) return null;

        const subsJson = subsDetail.toJSON() as any;
        
        if (subsJson.plan_id === 1) {
            subsJson.remaining_duration = 'Selamanya';
        } else {
            const endDate = new Date(subsJson.end_date);
            const now = new Date();
            const diffTime = endDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            subsJson.remaining_duration = diffDays > 0 ? `${diffDays} Hari` : '0 Hari';
        }

        return subsJson;
    }

    static async expireActiveSubscriptions(today: Date, t?: Transaction) {
        const [affectedCount] = await Subscription.update(
            {status: 'expired'},
            {
                where: {
                    end_date: {[Op.lte]: today},
                    status: 'active'
                },
                transaction: t
            }
        );
        return affectedCount;
    }

    static async changeActiveSubsStatus(userId: number, status: "active" | "expired" | "canceled", t?: Transaction) {
        const subscriptions = await Subscription.update(
            {status: status}, {
                where: {
                    user_id: userId,
                    status: 'active'
                }, transaction: t
            }
        )
        return subscriptions;
    }

    static async initiateFreePlan(userId: number, t?: Transaction) {
        const newSubscription = await this.createSubscription(
            userId,
            1,
            'active',
            'free_plan_login',
            'default_plan_for_new_user',
            t
        );

        const freePlan = await PlanService.getPlanById(1);
        if (!freePlan) {
            throw new Error('Free plan tidak ditemukan');
        }

        const userQuotaPayload: any = {
            user_id: userId,
            total_quota: freePlan.scan_quota,
            next_reset_date: new Date(new Date().setDate(new Date().getDate() + freePlan.duration_days))
        }

        const newUserQuota = await UserQuotaService.createUserQuota(userQuotaPayload, t);
        const newQuotaRedis = await UserQuotaService.upsertUserQuotaToRedis(userId, freePlan.scan_quota);

        const response = {
            newSubscription: newSubscription,
            newUserQuota: newUserQuota,
            newQuotaRedis: newQuotaRedis
        }
        return response
    }

}