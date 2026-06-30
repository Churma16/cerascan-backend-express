import { comparePassword } from "../domain/auth.domain";
import { generateToken } from "../../../utils/jwt";
import { IUserRepository } from "../../user/domain/IUserRepository";
import { SequelizeUserRepository } from "../../user/infrastructure/SequelizeUserRepository";

export class LoginUserUseCase {
    private userRepository: IUserRepository;

    constructor(userRepository: IUserRepository = new SequelizeUserRepository()) {
        this.userRepository = userRepository;
    }

    async execute(email: string, passwordInput: string) {
        const user = await this.userRepository.findByEmail(email);

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
