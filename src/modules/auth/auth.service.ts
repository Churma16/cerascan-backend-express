import bcrypt from "bcryptjs";
import User, {UserAttributes} from "../../models/user.model";
import {generateToken} from "../../utils/jwt";
import {Resend} from "resend";
import dotenv from "dotenv";
import UserOtp from "../../models/user_otp.model";
import crypto from "crypto";
import jwt, {JwtPayload} from "jsonwebtoken";
import {Profile} from "passport-google-oauth20";
import {SubscriptionService} from "../subscription/subscription.service";
import sequelize from "../../config/database";

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

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(data.password as string, salt);

        const payload: Partial<UserAttributes> = {
            full_name: data.full_name as string,
            email: data.email as string,
            password: hashedPassword,
            role: data.role || 'user',
            sub_tier: 'free',
        }

        const newUser = await User.create({
            full_name: payload.full_name!,
            email: payload.email!,
            password: payload.password!,
            role: payload.role!,
            sub_tier: payload.sub_tier!,
            plan_id: 1,
        })

        const userJSON = newUser.toJSON();
        delete userJSON.password;

        return userJSON;
    }

    static async registerUserV2(data: Partial<UserAttributes>) {
        const existingUser = await User.findOne({
            where: {
                email: data.email,
            }
        })

        if (existingUser) {
            throw new Error('Email sudah terdaftar');
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(data.password as string, salt);

        const payload: Partial<UserAttributes> = {
            full_name: data.full_name as string,
            email: data.email as string,
            password: hashedPassword,
            role: data.role || 'user',
            sub_tier: 'free',
        }

        const newUser = await User.create({
            full_name: payload.full_name!,
            email: payload.email!,
            password: payload.password!,
            role: payload.role!,
            sub_tier: payload.sub_tier!,
            plan_id: 1,
        })

        const verificationToken = jwt.sign(
            {userId: newUser.id},
            process.env.JWT_SECRET as string,
            {expiresIn: '24h'}
        );

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const verifiedLink = `${frontendUrl}/verify-email?token=${verificationToken}`;

        this.sendVerificationEmail(newUser.email, newUser.full_name, verifiedLink).then((emailSent) => {
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


    static async loginUser(email: string, passwordInput: string) {
        const user = await User.findOne({where: {email}});

        if (!user || !user.password) {
            throw new Error('Email atau password salah');
        }

        const isPasswordMatch = await bcrypt.compare(passwordInput, user.password);
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

    static async handleGoogleLogin(profile: Profile) {
        const userEmail = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : '';

        if (!userEmail) {
            throw new Error("Email tidak ditemukan dari profil Google");
        }

        let user = await User.findOne({where: {email: userEmail}});

        if (user) {
            if (!user.googleId) {
                user.googleId = profile.id;
                if (!user.avatar && profile.photos && profile.photos.length > 0) {
                    user.avatar = profile.photos[0].value;
                }

                if (!user.verified_at) {
                    user.verified_at = new Date();
                }
                await user.save();
            }
            return user;
        }

        const t = await sequelize.transaction();

        user = await User.create({
            full_name: profile.displayName,
            email: userEmail,
            googleId: profile.id,
            avatar: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : undefined,
            role: 'user',
            sub_tier: 'free',
            plan_id: 1,
            verified_at: new Date()
        }, {transaction: t});

        await SubscriptionService.initiateFreePlan(user.id, t)

        return user;
    }


    static async changePassword(userId: number, currentPassword: string, newPassword: string) {
        const user = await User.findOne({where: {id: userId}});

        if (!user) {
            throw new Error('User tidak ditemukan');
        }

        if (!user.password) {
            throw new Error('User tidak memiliki password');
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

    static async resetPassword(id: string, newPassword: string) {
        const user = await User.findOne({where: {id}});
        if (!user) {
            throw new Error('id tidak valid');
        }

        user.password = await this.hashPassword(newPassword);
        await user.save();

        return true;
    }


    static async verifyEmail(token: string) {
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
                throw new Error('Tautan verifikasi tidak valid atau telah kedaluwarsa', {cause: error});
            }
            throw error;
        }
    }

    static async sendVerificationEmail(toEmail: string, fullName: string, verificationLink: string) {
        try {
            const data = await resend.emails.send({
                from: 'CeraScan <noreply@churma.codes>',
                to: toEmail,
                subject: 'Verifikasi Email untuk Akun CeraScan Anda',
                html: `
                    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 12px;">
                        <h2 style="color: #042B1F; margin-bottom: 5px;">CeraScan</h2>
                        <p style="color: #666; margin-top: 0;">Sistem Deteksi Cacat Keramik</p>                     
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />                        
                        <p>Halo <strong>${fullName}</strong>,</p>
                        <p>Terima kasih telah mendaftar di CeraScan. Untuk menyelesaikan proses pendaftaran dan mengaktifkan akun Anda, silakan verifikasi alamat email dengan menekan tombol di bawah ini:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${verificationLink}" style="display: inline-block; padding: 14px 28px; background-color: #042B1F; color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 10px; font-size: 15px;">
                                Verifikasi Email Saya
                            </a>
                        </div>
                        <p style="color: #666; font-size: 13px;">Tautan ini hanya berlaku selama <strong>24 jam</strong>. Jika Anda tidak merasa mendaftar di CeraScan, abaikan saja email ini.</p>
                        <div style="background-color: #FAFAFA; border: 1px solid #eee; padding: 15px; border-radius: 8px; margin-top: 25px; word-break: break-all;">
                            <p style="color: #999; font-size: 11px; margin: 0; margin-bottom: 5px;">Jika tombol di atas tidak berfungsi, salin dan tempel tautan berikut ke browser Anda:</p>
                            <a href="${verificationLink}" style="color: #FF645A; font-size: 11px; text-decoration: none;">${verificationLink}</a>
                        </div>                       
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />                       
                        <p style="color: #999; font-size: 11px; text-align: center;">Email ini dikirim otomatis oleh sistem CeraScan, mohon tidak membalas.</p>
                    </div>`
            })
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

        this.sendOtpEmail(user.email, user.full_name, otpCode).then((emailSent) => {
            if (!emailSent.success) {
                console.error(`[Background Task] Gagal mengirim OTP ke ${user.email}`);
            }
        }).catch((err) => {
            console.error(`[Background Task] Error sistem saat kirim email:`, err);
        });

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

        const isOtpExpired = new Date() > activeOtp.expired_at;
        if (isOtpExpired) {
            throw new Error('Kode OTP telah kadaluarsa, silakan minta kode baru');
        }

        activeOtp.is_used = true;
        const t = await sequelize.transaction();

        await activeOtp.save({transaction: t});

        await SubscriptionService.initiateFreePlan(user.id, t)

        return user.id;
    }

    static async sendOtpEmail(toEmail: string, userName: string, otpCode: string) {
        try {
            const data = await resend.emails.send({
                from: 'CeraScan <noreply@churma.codes>',
                to: toEmail,
                subject: 'Kode OTP Reset Password CeraScan',
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

    private static async hashPassword(newPassword: string) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        return hashedPassword;
    }
}
