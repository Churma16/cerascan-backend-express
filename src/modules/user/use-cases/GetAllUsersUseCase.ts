import User from "../../../models/user.model";
import { Plan } from "../../../models";

export class GetAllUsersUseCase {
    async execute() {
        return await User.findAll({
            attributes: { exclude: ['password'] },
            include: [{
                model: Plan,
                as: "active_plan"
            }]
        });
    }
}
