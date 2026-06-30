import User from "../../../models/user.model";
import UserOtp from "../../../models/user_otp.model";
import { generateOtp } from "../domain/auth.domain";
import { EmailHelper } from "../infrastructure/email.helper";

export class ForgotPasswordUseCase {
    async execute(email: string) {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            throw new Error('Email tidak terdaftar');
        }

        const { otp, expiredAt } = generateOtp();

        await UserOtp.create({
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
