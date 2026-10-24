import { z } from "zod";

export const registerSchema = z.object({
    full_name: z.string().min(2, "Nama lengkap minimal 2 karakter"),
    email: z.string().email("Format email tidak valid"),
    password: z.string().min(6, "Password minimal 6 karakter"),
    role: z.enum(["user", "admin"]).optional().default("user")
});

export const registerV2Schema = registerSchema;

export const loginSchema = z.object({
    email: z.string().email("Format email tidak valid"),
    password: z.string().min(1, "Password wajib diisi")
});

export const changePasswordSchema = z.object({
    old_password: z.string().min(1, "Password lama wajib diisi"),
    new_password: z.string().min(6, "Password baru minimal 6 karakter")
});

export const forgotPasswordSchema = z.object({
    email: z.string().email("Format email tidak valid")
});

export const verifyOtpSchema = z.object({
    email: z.string().email("Format email tidak valid"),
    otp: z.string().min(4, "Kode OTP wajib diisi")
});

export const resetPasswordSchema = z.object({
    id: z.union([z.number(), z.string().regex(/^\d+$/, "ID pengguna harus berupa angka")]).transform(Number),
    new_password: z.string().min(6, "Password baru minimal 6 karakter")
});

export const verifyEmailQuerySchema = z.object({
    token: z.string().min(1, "Token verifikasi tidak ditemukan")
});

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
export type VerifyOtpDto = z.infer<typeof verifyOtpSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailQueryDto = z.infer<typeof verifyEmailQuerySchema>;
