import { hashPassword } from "../domain/auth.domain";
import { IUserRepository } from "../../user/domain/IUserRepository";
import { SequelizeUserRepository } from "../../user/infrastructure/SequelizeUserRepository";

export class ResetPasswordUseCase {
    private userRepository: IUserRepository;

    constructor(userRepository: IUserRepository = new SequelizeUserRepository()) {
        this.userRepository = userRepository;
    }

    async execute(id: string, newPassword: string) {
        const user = await this.userRepository.findByPk(Number(id));
        if (!user) {
            throw new Error('id tidak valid');
        }

        user.password = await hashPassword(newPassword);
        await this.userRepository.save(user);

        return true;
    }
}
