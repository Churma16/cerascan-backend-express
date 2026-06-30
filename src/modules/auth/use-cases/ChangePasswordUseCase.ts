import { comparePassword, hashPassword } from "../domain/auth.domain";
import { IUserRepository } from "../../user/domain/IUserRepository";
import { SequelizeUserRepository } from "../../user/infrastructure/SequelizeUserRepository";

export class ChangePasswordUseCase {
    private userRepository: IUserRepository;

    constructor(userRepository: IUserRepository = new SequelizeUserRepository()) {
        this.userRepository = userRepository;
    }

    async execute(userId: number, currentPassword: string, newPassword: string) {
        const user = await this.userRepository.findByPk(userId);

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

        await this.userRepository.save(user);

        return true;
    }
}
