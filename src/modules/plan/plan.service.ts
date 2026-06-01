import {Plan, Subscription} from "../../models";

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


    static async calculateUpgradePrice(userId: number, newPlanId: number) {
        // 1. Cari data langganan yang masih aktif
        const activeSub = await Subscription.findOne({
            where: {
                user_id: userId,
                status: 'active'
            },
            // Asumsi Anda sudah membuat relasi Subscription.belongsTo(Plan) dengan alias 'plan'
            include: ['plan']
        });

        // 2. Ambil data paket tujuan (paket baru)
        const newPlan = await Plan.findByPk(newPlanId);
        if (!newPlan) {
            throw new Error(`Plan tujuan dengan ID ${newPlanId} tidak ditemukan`);
        }

        // Jika user belum punya paket aktif (atau paket free), langsung kembalikan harga normal
        if (!activeSub || !activeSub.plan || activeSub.plan.price === 0) {
            return {
                original_price: newPlan.price,
                discount_prorata: 0,
                final_price: newPlan.price
            };
        }

        const oldPlan = activeSub.plan;

        // 3. Hitung sisa hari dari paket lama
        const today = new Date();
        const endDate = new Date(activeSub.end_date);

        // Konversi selisih waktu (milidetik) menjadi hari
        const diffTime = endDate.getTime() - today.getTime();
        const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Jika sisa hari minus (sudah kedaluwarsa tapi status belum terupdate), harga normal
        if (remainingDays <= 0) {
            return {
                original_price: newPlan.price,
                discount_prorata: 0,
                final_price: newPlan.price
            };
        }

        // 4. Hitung Nilai Sisa (Residual Value)
        const oldDailyRate = oldPlan.price / oldPlan.duration_days;
        const residualValue = Math.floor(remainingDays * oldDailyRate);

        // 5. Kurangi harga paket baru dengan nilai sisa
        let finalPrice = newPlan.price - residualValue;

        // Validasi: Cegah harga menjadi minus jika user melakukan downgrade
        // Midtrans juga biasanya menolak transaksi di bawah Rp 1.000 atau batas tertentu
        if (finalPrice < 1000) {
            finalPrice = 1000;
        }

        return {
            original_price: newPlan.price,
            discount_prorata: residualValue,
            final_price: finalPrice
        };
    }
}