import { UserAttributes } from "../../../models/user.model";
import { hashPassword } from "../domain/auth.domain";
import { IUserRepository } from "../../user/domain/IUserRepository";
import { SequelizeUserRepository } from "../../user/infrastructure/SequelizeUserRepository";

export class RegisterUserUseCase {
    private userRepository: IUserRepository;

    constructor(userRepository: IUserRepository = new SequelizeUserRepository()) {
        this.userRepository = userRepository;
    }

    async execute(data: Partial<UserAttributes>) {
        const existingUser = await this.userRepository.findByEmail(data.email!);
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

        const newUser = await this.userRepository.create({
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
