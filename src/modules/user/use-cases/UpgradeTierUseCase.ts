import { Transaction } from "sequelize";
import { IUserRepository } from "../domain/IUserRepository";
import { SequelizeUserRepository } from "../infrastructure/SequelizeUserRepository";

export class UpgradeTierUseCase {
    private userRepository: IUserRepository;

    constructor(userRepository: IUserRepository = new SequelizeUserRepository()) {
        this.userRepository = userRepository;
    }

    async execute(id: number, planId: number, t?: Transaction) {
        const user = await this.userRepository.findByPk(id, t);

        if (!user) {
            throw new Error('User tidak ditemukan');
        }

        user.plan_id = planId;
        await this.userRepository.save(user, t);

        return user;
    }
}
