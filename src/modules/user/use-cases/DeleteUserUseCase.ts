import User from "../../../models/user.model";

export class DeleteUserUseCase {
    async execute(id: number) {
        const user = await User.findByPk(id);

        if (!user) {
            throw new Error('User tidak ditemukan');
        }

        await user.destroy();
        return user;
    }
}
