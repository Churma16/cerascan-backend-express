import User, { UserAttributes } from "../../../models/user.model";
import bcrypt from "bcryptjs";
import { hashPassword } from "../domain/user.domain";

export class UpdateUserUseCase {
    async execute(id: number, data: Partial<UserAttributes>) {
        const user = await User.findOne({ where: { id } });

        if (!user) {
            throw new Error('User tidak ditemukan');
        }

        if (data.password) {
            data.password = await hashPassword(data.password);
        }

        await user.update(data);
        const userJSON = user.toJSON();
        delete userJSON.password;
        return userJSON;
    }
}
