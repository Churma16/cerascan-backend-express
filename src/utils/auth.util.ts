import bcrypt from "bcryptjs";
import crypto from "crypto";

export const hashPassword = async (password: string): Promise<string> => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

export const comparePassword = async (passwordInput: string, passwordHash: string): Promise<boolean> => {
    return await bcrypt.compare(passwordInput, passwordHash);
};

export const generateOtp = (): { otp: string; expiredAt: Date } => {
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiredAt = new Date(Date.now() + 10 * 60 * 1000);
    return { otp, expiredAt };
};
