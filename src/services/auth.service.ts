import { Profile } from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import sequelize from "../config/databaseClient";
import { userRepository, UserRepository } from "../repositories/user.repository";
import { userOtpRepository, UserOtpRepository } from "../repositories/userOtp.repository";
import { UserPlanLifecycleService } from "./userPlanLifecycle.service";
import { EmailService } from "./email.service";
import { hashPassword, comparePassword, generateOtp } from "../utils/auth.util";
import { generateToken } from "../utils/jwt.util";
import { User } from "../models";
import { UserAttributes } from "../models/user.model";
import { log } from "../utils/logger.util";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

export interface AuthSuccessPayload {
    user: {
        id: number;
        full_name: string;
        email: string;
        role: string;
        plan_id?: number;
        sub_tier?: string;
    };
    token: string;
}

export class AuthService {
    private userRepo: UserRepository;
    private otpRepo: UserOtpRepository;

    constructor(
        userRepo: UserRepository = userRepository,
        otpRepo: UserOtpRepository = userOtpRepository
    ) {
        this.userRepo = userRepo;
        this.otpRepo = otpRepo;
    }

    private buildAuthPayload(user: User): AuthSuccessPayload {
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
                role: user.role,
                plan_id: user.plan_id,
                sub_tier: user.sub_tier
            },
            token
        };
    }

    async register(data: Partial<UserAttributes>): Promise<any> {
        const existingUser = await this.userRepo.findByEmail(data.email!);
        if (existingUser) {
            throw new Error("Email sudah terdaftar");
        }

        const hashedPassword = await hashPassword(data.password as string);

        const newUser = await this.userRepo.create({
            full_name: data.full_name!,
            email: data.email!,
            password: hashedPassword,
            role: data.role || "user",
            sub_tier: "free",
            plan_id: 1
        });

        await UserPlanLifecycleService.assignPlan(newUser.id, 1, {
            acquisitionMethod: "registration",
            note: "Free plan otomatis saat registrasi"
        });

        const userJson = newUser.toJSON();
        delete (userJson as any).password;
        return userJson;
    }

    async registerV2(data: Partial<UserAttributes>): Promise<any> {
        const existingUser = await this.userRepo.findByEmail(data.email!);
        if (existingUser) {
            throw new Error("Email sudah terdaftar");
        }

        const hashedPassword = await hashPassword(data.password as string);

        const newUser = await this.userRepo.create({
            full_name: data.full_name!,
            email: data.email!,
            password: hashedPassword,
            role: data.role || "user",
            sub_tier: "free",
            plan_id: 1
        });

        await UserPlanLifecycleService.assignPlan(newUser.id, 1, {
            acquisitionMethod: "registration",
            note: "Free plan otomatis saat registrasi v2"
        });

        const verificationToken = jwt.sign(
            { id: newUser.id, email: newUser.email },
            JWT_SECRET,
            { expiresIn: "1d" }
        );

        const verificationLink = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;
        await EmailService.sendVerificationEmail(newUser.email, newUser.full_name, verificationLink);

        const userJson = newUser.toJSON();
        delete (userJson as any).password;
        return userJson;
    }

    async login(email: string, passwordInput: string): Promise<AuthSuccessPayload> {
        const user = await this.userRepo.findByEmail(email);
        if (!user || !user.password) {
            throw new Error("Email atau password salah");
        }

        const isPasswordMatch = await comparePassword(passwordInput, user.password);
        if (!isPasswordMatch) {
            throw new Error("Email atau password salah");
        }

        return this.buildAuthPayload(user);
    }

    async handleGoogleAuth(profile: Profile): Promise<User> {
        const userEmail = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : "";
        if (!userEmail) {
            throw new Error("Email tidak ditemukan dari profil Google");
        }

        let user = await this.userRepo.findByEmail(userEmail);

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

        const dbTransaction = await sequelize.transaction();

        try {
            user = await this.userRepo.create({
                full_name: profile.displayName,
                email: userEmail,
                googleId: profile.id,
                avatar: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : undefined,
                role: "user",
                sub_tier: "free",
                plan_id: 1,
                verified_at: new Date()
            }, dbTransaction);

            await UserPlanLifecycleService.assignPlan(user.id, 1, {
                acquisitionMethod: "google_oauth",
                note: "Free plan otomatis saat pendaftaran Google OAuth",
                transaction: dbTransaction
            });

            await dbTransaction.commit();
            return user;
        } catch (authError) {
            await dbTransaction.rollback();
            throw authError;
        }
    }

    buildAuthToken(user: UserAttributes): string {
        return generateToken({
            id: user.id,
            role: user.role,
            plan_id: user.plan_id
        });
    }

    async verifyOtp(email: string, otp: string): Promise<number> {
        const user = await this.userRepo.findByEmail(email);
        if (!user) {
            throw new Error("Email tidak terdaftar");
        }

        const activeOtp = await this.otpRepo.findActiveOtp(user.id, otp);
        if (!activeOtp) {
            throw new Error("Kode OTP tidak valid atau sudah digunakan");
        }

        if (new Date() > activeOtp.expired_at) {
            throw new Error("Kode OTP telah kadaluarsa, silakan minta kode baru");
        }

        activeOtp.is_used = true;
        await this.otpRepo.save(activeOtp);

        if (!user.verified_at) {
            user.verified_at = new Date();
            await user.save();
        }

        return user.id;
    }

    async changePassword(userId: number, oldPasswordInput: string, newPasswordInput: string): Promise<void> {
        const user = await this.userRepo.findByPk(userId);
        if (!user || !user.password) {
            throw new Error("User tidak ditemukan");
        }

        const isPasswordMatch = await comparePassword(oldPasswordInput, user.password);
        if (!isPasswordMatch) {
            throw new Error("Password lama salah");
        }

        user.password = await hashPassword(newPasswordInput);
        await user.save();
    }

    async forgotPassword(email: string): Promise<void> {
        const user = await this.userRepo.findByEmail(email);
        if (!user) {
            throw new Error("Email tidak terdaftar di sistem kami");
        }

        const { otp, expiredAt } = generateOtp();
        await this.otpRepo.create({
            user_id: user.id,
            otp,
            expired_at: expiredAt,
            is_used: false
        });

        EmailService.sendOtpEmail(user.email, user.full_name, otp).catch((error) => {
            log.error("AuthService", `Background email delivery failed for ${user.email}`, error);
        });
    }

    async resetPassword(userId: number, newPasswordInput: string): Promise<void> {
        const user = await this.userRepo.findByPk(userId);
        if (!user) {
            throw new Error("ID pengguna tidak valid");
        }

        user.password = await hashPassword(newPasswordInput);
        await user.save();
    }

    async verifyEmail(token: string): Promise<void> {
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string };
            const user = await this.userRepo.findByPk(decoded.id);

            if (!user) {
                throw new Error("Pengguna tidak ditemukan");
            }

            if (user.verified_at) {
                return;
            }

            user.verified_at = new Date();
            await user.save();
        } catch {
            throw new Error("Token verifikasi tidak valid atau telah kadaluarsa");
        }
    }
}

export const authService = new AuthService();
