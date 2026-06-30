import User from "../../../models/user.model";
import UserOtp from "../../../models/user_otp.model";
import { InitiateFreePlanUseCase } from "../../subscription/use-cases/InitiateFreePlanUseCase";
import sequelize from "../../../config/database";
import { getRedisClient } from "../../../config/redis_client";

export class VerifyOtpUseCase {
    async execute(email: string, otp: string) {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            throw new Error('Email tidak terdaftar');
        }

        const activeOtp = await UserOtp.findOne({
            where: {
                user_id: user.id,
                otp: otp,
                is_used: false
            },
            order: [['createdAt', 'DESC']]
        });

        if (!activeOtp) {
            throw new Error('Kode OTP tidak valid atau sudah digunakan');
        }

        const isOtpExpired = new Date() > activeOtp.expired_at;
        if (isOtpExpired) {
            throw new Error('Kode OTP telah kadaluarsa, silakan minta kode baru');
        }

        activeOtp.is_used = true;
        const t = await sequelize.transaction();

        try {
            await activeOtp.save({ transaction: t });
            const initiateFreePlanUseCase = new InitiateFreePlanUseCase();
            await initiateFreePlanUseCase.execute(user.id, t);
            await t.commit();
            return user.id;
        } catch (error) {
            await t.rollback();
            try {
                const redis = getRedisClient();
                await redis.del(`user:${user.id}:remaining_quota`);
            } catch (redisErr) {
                console.error("Gagal menghapus cache Redis setelah rollback verifyOtp:", redisErr);
            }
            throw error;
        }
    }
}
