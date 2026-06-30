import User from "../../../models/user.model";
import { Transaction } from "sequelize";

export class UpgradeTierUseCase {
    async execute(id: number, planId: number, t?: Transaction) {
        const user = await User.findOne({
            where: { id },
            transaction: t
        });

        if (!user) {
            throw new Error('User tidak ditemukan');
        }

        user.plan_id = planId;
        await user.save({ transaction: t });

        return user;
    }
}
