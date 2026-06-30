import { Request, Response } from "express";
import { sendResponse } from "../../utils/response";
import { AuthRequest } from "../../middleware/auth.guard";
import { UserAttributes } from "../../models/user.model";
import jwt from "jsonwebtoken";

import { RegisterUserUseCase } from "./use-cases/RegisterUserUseCase";
import { RegisterUserV2UseCase } from "./use-cases/RegisterUserV2UseCase";
import { LoginUserUseCase } from "./use-cases/LoginUserUseCase";
import { ChangePasswordUseCase } from "./use-cases/ChangePasswordUseCase";
import { ForgotPasswordUseCase } from "./use-cases/ForgotPasswordUseCase";
import { VerifyOtpUseCase } from "./use-cases/VerifyOtpUseCase";
import { ResetPasswordUseCase } from "./use-cases/ResetPasswordUseCase";
import { VerifyEmailUseCase } from "./use-cases/VerifyEmailUseCase";

export class AuthController {
    static async register(req: Request, res: Response) {
        try {
            const useCase = new RegisterUserUseCase();
            const result = await useCase.execute(req.body);

            res.status(201).json({
                status: 'success',
                message: 'Registrasi berhasil',
                data: result
            });
        } catch (error: any) {
            res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
    }

    static async registerV2(req: Request, res: Response) {
        try {
            const useCase = new RegisterUserV2UseCase();
            const result = await useCase.execute(req.body);
            return sendResponse(res, 201, 'Registrasi berhasil', result);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async verifyEmail(req: Request, res: Response) {
        try {
            const { token } = req.query;

            if (!token) {
                return sendResponse(res, 400, "Token verifikasi tidak ditemukan");
            }

            const useCase = new VerifyEmailUseCase();
            await useCase.execute(token as string);

            return sendResponse(res, 200, "Email Anda berhasil diverifikasi");
        } catch (error: any) {
            return sendResponse(res, 400, error.message);
        }
    }

    static async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ status: 'error', message: 'Email dan password wajib diisi' });
            }
            const useCase = new LoginUserUseCase();
            const result = await useCase.execute(email, password);

            return sendResponse(res, 201, "Login Berhasil", result);
        } catch (error: any) {
            return sendResponse(res, 401, error.message);
        }
    }

    static async googleCallback(req: Request, res: Response) {
        const user = req.user as UserAttributes;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        if (!user) {
            return res.redirect(`${frontendUrl}/login?error=auth_failed`);
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, role: user.role, plan_id: user.plan_id },
            process.env.JWT_SECRET as string,
            { expiresIn: '1d' }
        );

        res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    }

    static async changePassword(req: AuthRequest, res: Response) {
        try {
            const { old_password, new_password } = req.body;
            const userId = req.user?.id;

            if (!userId) {
                return sendResponse(res, 401, "Sesi tidak valid");
            }

            if (!old_password || !new_password) {
                return sendResponse(res, 400, "old_password dan new_password wajib diisi");
            }

            const useCase = new ChangePasswordUseCase();
            const result = await useCase.execute(userId, old_password, new_password);
            return sendResponse(res, 200, "Password berhasil diganti", result);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async forgotPassword(req: Request, res: Response) {
        try {
            const { email } = req.body;

            if (!email) {
                return sendResponse(res, 400, "Email wajib diisi");
            }

            const useCase = new ForgotPasswordUseCase();
            await useCase.execute(email);
            return sendResponse(res, 200, "Kode OTP berhasil dikirim ke email Anda");
        } catch (error: any) {
            return sendResponse(res, 400, error.message);
        }
    }

    static async verifyOtp(req: Request, res: Response) {
        try {
            const { email, otp } = req.body;

            if (!email || !otp) {
                return sendResponse(res, 400, "Email dan OTP wajib diisi");
            }

            const useCase = new VerifyOtpUseCase();
            const userId = await useCase.execute(email, otp);

            return sendResponse(res, 200, "OTP valid, silakan lanjutkan untuk reset password", { user_id: userId });
        } catch (error: any) {
            return sendResponse(res, 400, error.message);
        }
    }

    static async resetPassword(req: Request, res: Response) {
        try {
            const { id, new_password } = req.body;

            if (!id || !new_password) {
                return sendResponse(res, 400, "ID pengguna dan password baru wajib diisi");
            }

            const useCase = new ResetPasswordUseCase();
            await useCase.execute(id, new_password);
            return sendResponse(res, 200, "Password Anda berhasil diperbarui. Silakan login kembali.");
        } catch (error: any) {
            return sendResponse(res, 400, error.message);
        }
    }
}