import User from "../../../models/user.model";
import { Plan } from "../../../models";

export class GetUserByIdUseCase {
    async execute(id: number) {
        const user = await User.findOne({
            where: { id },
            attributes: { exclude: ['password'] },
            include: [{
                model: Plan,
                as: "active_plan"
            }]
        });

        if (!user) {
            throw new Error('User tidak ditemukan');
        }

        return user;
    }
}
