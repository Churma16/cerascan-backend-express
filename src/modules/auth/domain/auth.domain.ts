import bcrypt from "bcryptjs";
import crypto from "crypto";

/**
 * Domain function untuk memproses/hashing password.
 */
export const hashPassword = async (password: string): Promise<string> => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

/**
 * Domain function untuk membandingkan password input dengan password hash.
 */
export const comparePassword = async (passwordInput: string, passwordHash: string): Promise<boolean> => {
    return await bcrypt.compare(passwordInput, passwordHash);
};

/**
 * Domain function untuk membuat OTP dan masa kadaluarsanya (10 menit).
 */
export const generateOtp = (): { otp: string; expiredAt: Date } => {
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiredAt = new Date(Date.now() + 10 * 60 * 1000);
    return { otp, expiredAt };
};
