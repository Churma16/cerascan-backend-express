import { Subscription } from "../../../models";

export class DeleteSubscriptionUseCase {
    async execute(id: number) {
        const subscription = await Subscription.findByPk(id);
        if (!subscription) {
            throw new Error(`Subscription dengan ID ${id} tidak ditemukan`);
        }
        await subscription.destroy();
        return { message: `Subscription dengan ID ${id} berhasil dihapus` };
    }
}
