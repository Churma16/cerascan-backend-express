import bcrypt from "bcryptjs";
import User, {UserAttributes} from "../../models/user.model";
import {generateToken} from "../../utils/jwt";
import {Resend} from "resend";
import dotenv from "dotenv";
import UserOtp from "../../models/user_otp.model";
import crypto from "crypto";


dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

export class AuthService {

    static async registerUser(data: Partial<UserAttributes>) {
        const existingUser = await User.findOne({
            where: {
                email: data.email,
            }
        })
        if (existingUser) {
            throw new Error('Email sudah terdaftar');
        }

        // Encrypt
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(data.password as string, salt);

        const payload = {
            full_name: data.full_name as string,
            email: data.email as string,
            password: hashedPassword,
            role: data.role || 'user',
        }

        const newUser = await User.create({
            ...payload,
        })

        const userJSON = newUser.toJSON();
        delete userJSON.password;

        return userJSON;
    }

    static async loginUser(email: string, passwordInput: string) {
        const user = await User.findOne({where: {email}});

        if (!user || !user.password) {
            throw new Error('Email atau password salah');
        }

        const isPasswordMatch = await bcrypt.compare(passwordInput, user.password);
        if (!isPasswordMatch) {
            throw new Error('Email atau password salah');
        }

        // Buat JWT Token (Bungkus ID dan Role di dalamnya)
        const token = generateToken({
            id: user.id,
            role: user.role
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

    static async changePassword(userId: number, currentPassword: string, newPassword: string) {
        const user = await User.findOne({where: {id: userId}});

        if (!user) {
            throw new Error('User tidak ditemukan');
        }

        const isPasswordMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordMatch) {
            throw new Error('Password tidak valid');
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        user.password = hashedPassword;

        await user.save();

        return true;
    }

    static async sendOtpEmail(toEmail: string, userName: string, otpCode: string) {
        try {
            const data = await resend.emails.send({
                from: 'CeraScan <noreply@churma.codes>',
                to: toEmail,
                subject: '🔒 Kode OTP Reset Password CeraScan',
                html: `
                    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 12px;">
                        <h2 style="color: #042B1F; margin-bottom: 5px;">CeraScan</h2>
                        <p style="color: #666; margin-top: 0;">Sistem Deteksi Cacat Keramik</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                        <p>Halo <strong>${userName}</strong>,</p>
                        <p>Kami menerima permintaan untuk mengatur ulang kata sandi akun Anda. Gunakan kode OTP di bawah ini untuk melanjutkan:</p>
                        <div style="background-color: #FAFAFA; border: 1px solid #eee; padding: 15px; text-align: center; border-radius: 12px; margin: 25px 0;">
                            <span style="font-size: 32px; font-weight: 900; letter-spacing: 4px; color: #FF645A;">${otpCode}</span>
                        </div>
                        <p style="color: #666; font-size: 13px;">Kode ini hanya berlaku selama <strong>10 menit</strong>. Demi keamanan akun Anda, jangan sebarkan kode ini kepada siapa pun.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                        <p style="color: #999; font-size: 11px; text-align: center;">Email ini dikirim otomatis oleh sistem CeraScan, mohon tidak membalas.</p>
                    </div>
                `,
            });
            return {success: true, data};
        } catch (error) {
            console.error('Gagal mengirim email via Resend:', error);
            return {success: false, error};
        }
    }

    static async forgotPassword(email: string) {
        const user = await User.findOne({where: {email}});
        if (!user) {
            throw new Error('Email tidak terdaftar');
        }

        const otpCode = crypto.randomInt(100000, 999999).toString();
        const expiredAt = new Date(Date.now() + 10 * 60 * 1000);

        await UserOtp.create({
            user_id: user.id,
            otp: otpCode,
            expired_at: expiredAt,
            is_used: false
        });

        const emailSent = await this.sendOtpEmail(user.email, user.full_name, otpCode);
        if (!emailSent.success) {
            throw new Error('Gagal mengirim email, silakan coba lagi nanti');
        }

        return true;
    }

    static async resetPassword(id: string, newPassword: string) {
        const user = await User.findOne({where: {id}});
        if (!user) {
            throw new Error('id tidak valid');
        }

        // Simpan password baru
        user.password = await this.hashPassword(newPassword);
        await user.save();

        return true;
    }

    static async verifyOtp(email: string, otp: string) {
        const user = await User.findOne({where: {email}});
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

        let isOtpExpired = new Date() > activeOtp.expired_at;
        if (isOtpExpired) {
            throw new Error('Kode OTP telah kadaluarsa, silakan minta kode baru');
        }

        activeOtp.is_used = true;
        await activeOtp.save();

        return user.id;
    }

    private static async hashPassword(newPassword: string) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        return hashedPassword;
    }


}