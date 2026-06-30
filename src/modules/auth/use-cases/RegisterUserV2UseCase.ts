import { UserAttributes } from "../../../models/user.model";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { hashPassword } from "../domain/auth.domain";
import { EmailHelper } from "../infrastructure/email.helper";
import { IUserRepository } from "../../user/domain/IUserRepository";
import { SequelizeUserRepository } from "../../user/infrastructure/SequelizeUserRepository";

dotenv.config();

export class RegisterUserV2UseCase {
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

        const verificationToken = jwt.sign(
            { userId: newUser.id },
            process.env.JWT_SECRET as string,
            { expiresIn: '24h' }
        );

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const verifiedLink = `${frontendUrl}/verify-email?token=${verificationToken}`;

        EmailHelper.sendVerificationEmail(newUser.email, newUser.full_name, verifiedLink).then((emailSent) => {
            if (!emailSent.success) {
                console.error(`[Background Task] Gagal mengirim verifikasi ke ${newUser.email}`);
            }
        }).catch((err) => {
            console.error(`[Background Task] Error sistem saat kirim email:`, err);
        });

        const userJSON = newUser.toJSON();
        delete userJSON.password;

        return userJSON;
    }
}
