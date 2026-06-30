import { ISubscriptionRepository } from "../domain/ISubscriptionRepository";
import { SequelizeSubscriptionRepository } from "../infrastructure/SequelizeSubscriptionRepository";

export class DeleteSubscriptionUseCase {
    private subscriptionRepository: ISubscriptionRepository;

    constructor(subscriptionRepository: ISubscriptionRepository = new SequelizeSubscriptionRepository()) {
        this.subscriptionRepository = subscriptionRepository;
    }

    async execute(id: number) {
        const subscription = await this.subscriptionRepository.findByPk(id);
        if (!subscription) {
            throw new Error(`Subscription dengan ID ${id} tidak ditemukan`);
        }
        await this.subscriptionRepository.destroy(id);
        return { message: `Subscription dengan ID ${id} berhasil dihapus` };
    }
}
