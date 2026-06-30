import User from "../../../models/user.model";
import jwt, { JwtPayload } from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export class VerifyEmailUseCase {
    async execute(token: string) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload & { userId?: number };
            const userId = decoded.userId;

            const user = await User.findByPk(userId);

            if (!user) {
                throw new Error('Pengguna tidak ditemukan');
            }

            if (user.verified_at) {
                throw new Error('Email sudah diverifikasi sebelumnya');
            }

            user.verified_at = new Date();
            await user.save();

            return true;
        } catch (error: any) {
            if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                throw new Error('Tautan verifikasi tidak valid atau telah kedaluwarsa', { cause: error });
            }
            throw error;
        }
    }
}
