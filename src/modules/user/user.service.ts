import { SequelizeUserRepository } from "./infrastructure/SequelizeUserRepository";
import { UpdateUserUseCase } from "./use-cases/UpdateUserUseCase";

const userRepository = new SequelizeUserRepository();
const updateUserUseCase = new UpdateUserUseCase();

export class UserService {
    static async getAllUsers() {
        return await userRepository.findAll();
    }

    static async getUserById(userId: number) {
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new Error("Data pengguna tidak ditemukan");
        }
        return user;
    }

    static async updateUser(userId: number, data: any) {
        return await updateUserUseCase.execute(userId, data);
    }

    static async deleteUser(userId: number) {
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new Error("User tidak ditemukan");
        }
        await userRepository.destroy(userId);
        return user;
    }
}
