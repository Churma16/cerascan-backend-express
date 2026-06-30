import { IUserRepository } from "../domain/IUserRepository";
import { SequelizeUserRepository } from "../infrastructure/SequelizeUserRepository";

export class GetAllUsersUseCase {
    private userRepository: IUserRepository;

    constructor(userRepository: IUserRepository = new SequelizeUserRepository()) {
        this.userRepository = userRepository;
    }

    async execute() {
        return await this.userRepository.findAll();
    }
}
