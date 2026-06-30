import User from "../../../models/user.model";
import { comparePassword } from "../domain/auth.domain";
import { generateToken } from "../../../utils/jwt";

export class LoginUserUseCase {
    async execute(email: string, passwordInput: string) {
        const user = await User.findOne({ where: { email } });

        if (!user || !user.password) {
            throw new Error('Email atau password salah');
        }

        const isPasswordMatch = await comparePassword(passwordInput, user.password);
        if (!isPasswordMatch) {
            throw new Error('Email atau password salah');
        }

        const token = generateToken({
            id: user.id,
            role: user.role,
            plan_id: user.plan_id
        });

        return {
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.role
            },
            token
        };
    }
}
