import { UserAttributes } from "../../../models/user.model";
import { hashPassword } from "../domain/user.domain";
import { IUserRepository } from "../domain/IUserRepository";
import { SequelizeUserRepository } from "../infrastructure/SequelizeUserRepository";

export class UpdateUserUseCase {
    private userRepository: IUserRepository;

    constructor(userRepository: IUserRepository = new SequelizeUserRepository()) {
        this.userRepository = userRepository;
    }

    async execute(id: number, data: Partial<UserAttributes>) {
        const user = await this.userRepository.findByPk(id);

        if (!user) {
            throw new Error('User tidak ditemukan');
        }

        if (data.password) {
            data.password = await hashPassword(data.password);
        }

        await this.userRepository.update(id, data);
        
        const updatedUser = await this.userRepository.findByPk(id);
        if (!updatedUser) {
            throw new Error('User tidak ditemukan setelah diupdate');
        }

        const userJSON = updatedUser.toJSON();
        delete userJSON.password;
        return userJSON;
    }
}
