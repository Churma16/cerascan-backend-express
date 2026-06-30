import User from "../../../models/user.model";
import { hashPassword } from "../domain/auth.domain";

export class ResetPasswordUseCase {
    async execute(id: string, newPassword: string) {
        const user = await User.findOne({ where: { id } });
        if (!user) {
            throw new Error('id tidak valid');
        }

        user.password = await hashPassword(newPassword);
        await user.save();

        return true;
    }
}
