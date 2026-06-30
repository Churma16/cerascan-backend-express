import { generateOtp } from "../domain/auth.domain";
import { EmailHelper } from "../infrastructure/email.helper";
import { IUserRepository } from "../../user/domain/IUserRepository";
import { SequelizeUserRepository } from "../../user/infrastructure/SequelizeUserRepository";
import { IUserOtpRepository } from "../domain/IUserOtpRepository";
import { SequelizeUserOtpRepository } from "../infrastructure/SequelizeUserOtpRepository";

export class ForgotPasswordUseCase {
    private userRepository: IUserRepository;
    private userOtpRepository: IUserOtpRepository;

    constructor(
        userRepository: IUserRepository = new SequelizeUserRepository(),
        userOtpRepository: IUserOtpRepository = new SequelizeUserOtpRepository()
    ) {
        this.userRepository = userRepository;
        this.userOtpRepository = userOtpRepository;
    }

    async execute(email: string) {
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            throw new Error('Email tidak terdaftar');
        }

        const { otp, expiredAt } = generateOtp();

        await this.userOtpRepository.create({
            user_id: user.id,
            otp: otp,
            expired_at: expiredAt,
            is_used: false
        });

        EmailHelper.sendOtpEmail(user.email, user.full_name, otp).then((emailSent) => {
            if (!emailSent.success) {
                console.error(`[Background Task] Gagal mengirim OTP ke ${user.email}`);
            }
        }).catch((err) => {
            console.error(`[Background Task] Error sistem saat kirim email:`, err);
        });

        return true;
    }
}
