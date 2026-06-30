import User from "../../../models/user.model";
import { comparePassword, hashPassword } from "../domain/auth.domain";

export class ChangePasswordUseCase {
    async execute(userId: number, currentPassword: string, newPassword: string) {
        const user = await User.findOne({ where: { id: userId } });

        if (!user) {
            throw new Error('User tidak ditemukan');
        }

        if (!user.password) {
            throw new Error('User tidak memiliki password');
        }

        const isPasswordMatch = await comparePassword(currentPassword, user.password);
        if (!isPasswordMatch) {
            throw new Error('Password tidak valid');
        }

        const hashedPassword = await hashPassword(newPassword);
        user.password = hashedPassword;

        await user.save();

        return true;
    }
}
