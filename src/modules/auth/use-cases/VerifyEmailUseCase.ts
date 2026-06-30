import jwt, { JwtPayload } from "jsonwebtoken";
import dotenv from "dotenv";
import { IUserRepository } from "../../user/domain/IUserRepository";
import { SequelizeUserRepository } from "../../user/infrastructure/SequelizeUserRepository";

dotenv.config();

export class VerifyEmailUseCase {
    private userRepository: IUserRepository;

    constructor(userRepository: IUserRepository = new SequelizeUserRepository()) {
        this.userRepository = userRepository;
    }

    async execute(token: string) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload & { userId?: number };
            const userId = decoded.userId;

            if (!userId) {
                throw new Error('Token tidak valid');
            }

            const user = await this.userRepository.findByPk(userId);

            if (!user) {
                throw new Error('Pengguna tidak ditemukan');
            }

            if (user.verified_at) {
                throw new Error('Email sudah diverifikasi sebelumnya');
            }

            user.verified_at = new Date();
            await this.userRepository.save(user);

            return true;
        } catch (error: any) {
            if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                throw new Error('Tautan verifikasi tidak valid atau telah kedaluwarsa', { cause: error });
            }
            throw error;
        }
    }
}
