import { InitiateFreePlanUseCase } from "../../subscription/use-cases/InitiateFreePlanUseCase";
import sequelize from "../../../config/database";
import { getRedisClient } from "../../../config/redis_client";
import { IUserRepository } from "../../user/domain/IUserRepository";
import { SequelizeUserRepository } from "../../user/infrastructure/SequelizeUserRepository";
import { IUserOtpRepository } from "../domain/IUserOtpRepository";
import { SequelizeUserOtpRepository } from "../infrastructure/SequelizeUserOtpRepository";

export class VerifyOtpUseCase {
    private userRepository: IUserRepository;
    private userOtpRepository: IUserOtpRepository;

    constructor(
        userRepository: IUserRepository = new SequelizeUserRepository(),
        userOtpRepository: IUserOtpRepository = new SequelizeUserOtpRepository()
    ) {
        this.userRepository = userRepository;
        this.userOtpRepository = userOtpRepository;
    }

    async execute(email: string, otp: string) {
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            throw new Error('Email tidak terdaftar');
        }

        const activeOtp = await this.userOtpRepository.findActiveOtp(user.id, otp);

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
            await this.userOtpRepository.save(activeOtp, t);
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
