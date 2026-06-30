import { IUserRepository } from "../domain/IUserRepository";
import { SequelizeUserRepository } from "../infrastructure/SequelizeUserRepository";

export class GetUserByIdUseCase {
    private userRepository: IUserRepository;

    constructor(userRepository: IUserRepository = new SequelizeUserRepository()) {
        this.userRepository = userRepository;
    }

    async execute(id: number) {
        const user = await this.userRepository.findById(id);

        if (!user) {
            throw new Error('User tidak ditemukan');
        }

        return user;
    }
}
