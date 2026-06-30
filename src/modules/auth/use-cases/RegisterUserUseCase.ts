import User, { UserAttributes } from "../../../models/user.model";
import { hashPassword } from "../domain/auth.domain";

export class RegisterUserUseCase {
    async execute(data: Partial<UserAttributes>) {
        const existingUser = await User.findOne({
            where: { email: data.email }
        });
        if (existingUser) {
            throw new Error('Email sudah terdaftar');
        }

        const hashedPassword = await hashPassword(data.password as string);

        const payload: Partial<UserAttributes> = {
            full_name: data.full_name as string,
            email: data.email as string,
            password: hashedPassword,
            role: data.role || 'user',
            sub_tier: 'free',
        };

        const newUser = await User.create({
            full_name: payload.full_name!,
            email: payload.email!,
            password: payload.password!,
            role: payload.role!,
            sub_tier: payload.sub_tier!,
            plan_id: 1,
        });

        const userJSON = newUser.toJSON();
        delete userJSON.password;

        return userJSON;
    }
}
