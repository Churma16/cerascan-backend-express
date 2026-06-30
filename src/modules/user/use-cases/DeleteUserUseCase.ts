import { IUserRepository } from "../domain/IUserRepository";
import { SequelizeUserRepository } from "../infrastructure/SequelizeUserRepository";

export class DeleteUserUseCase {
    private userRepository: IUserRepository;

    constructor(userRepository: IUserRepository = new SequelizeUserRepository()) {
        this.userRepository = userRepository;
    }

    async execute(id: number) {
        const user = await this.userRepository.findByPk(id);

        if (!user) {
            throw new Error('User tidak ditemukan');
        }

        await this.userRepository.destroy(id);
        return user;
    }
}
