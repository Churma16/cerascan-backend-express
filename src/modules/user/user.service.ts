import User, {UserAttributes} from "../../models/user.model";
import bcrypt from "bcryptjs";

export class UserService {
    static async getAllUsers() {
        return await User.findAll({
            attributes: {exclude: ['password']}
        });
    }

    static async getUserById(id: number) {
        const user = await User.findOne({
            where: {
                id: id
            },
            attributes: {exclude: ['password']}

        })
        if (!user) {
            throw new Error('User tidak ditemukan');
        }

        return user;
    }

    static async updateUser(id: number, data: Partial<UserAttributes>) {
        const user = await User.findOne({
            where: {
                id: id
            }
        })

        if (!user) {
            throw new Error('User tidak ditemukan');
        }

        if (data.password) {
            const salt = await bcrypt.genSalt(10);
            data.password = await bcrypt.hash(data.password, salt);
        }

        await user.update(data);
        const userJSON = user.toJSON();
        delete userJSON.password;
        return userJSON;
    }

    static async deleteUser(id: number) {
        const user = await User.findByPk(id);

        if (!user) {
            throw new Error('User tidak ditemukan');
        }

        await user.destroy();
        return user;
    }
}
