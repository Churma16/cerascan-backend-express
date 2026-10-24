import { Request, Response } from "express";
import { authService } from "../services/auth.service";
import { sendResponse } from "../utils/response.util";
import { AuthRequest } from "../middleware/auth.middleware";
import { UserAttributes } from "../models/user.model";
import {
    RegisterDto,
    LoginDto,
    ChangePasswordDto,
    ForgotPasswordDto,
    VerifyOtpDto,
    ResetPasswordDto,
    VerifyEmailQueryDto
} from "../schemas/auth.schema";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

export class AuthController {
    static async register(req: Request, res: Response) {
        try {
            const payload = req.body as RegisterDto;
            const registeredUser = await authService.register(payload);
            res.status(201).json({
                status: "success",
                message: "Registrasi berhasil",
                data: registeredUser
            });
        } catch (error: any) {
            res.status(400).json({
                status: "error",
                message: error.message
            });
        }
    }

    static async registerV2(req: Request, res: Response) {
        try {
            const payload = req.body as RegisterDto;
            const registeredUser = await authService.registerV2(payload);
            return sendResponse(res, 201, "Registrasi berhasil", registeredUser);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async verifyEmail(req: Request, res: Response) {
        try {
            const { token } = req.query as unknown as VerifyEmailQueryDto;
            await authService.verifyEmail(token);
            return sendResponse(res, 200, "Email Anda berhasil diverifikasi");
        } catch (error: any) {
            return sendResponse(res, 400, error.message);
        }
    }

    static async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body as LoginDto;
            const loginResult = await authService.login(email, password);
            return sendResponse(res, 201, "Login Berhasil", loginResult);
        } catch (error: any) {
            return sendResponse(res, 401, error.message);
        }
    }

    static async googleCallback(req: Request, res: Response) {
        const authenticatedUser = req.user as UserAttributes;
        if (!authenticatedUser) {
            return res.redirect(`${FRONTEND_URL}/login?error=auth_failed`);
        }

        const authToken = authService.buildAuthToken(authenticatedUser);
        return res.redirect(`${FRONTEND_URL}/auth/callback?token=${authToken}`);
    }

    static async changePassword(req: AuthRequest, res: Response) {
        try {
            const { old_password, new_password } = req.body as ChangePasswordDto;
            const authenticatedUserId = req.user?.id;

            if (!authenticatedUserId) {
                return sendResponse(res, 401, "Sesi tidak valid");
            }

            await authService.changePassword(authenticatedUserId, old_password, new_password);
            return sendResponse(res, 200, "Password berhasil diganti", true);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async forgotPassword(req: Request, res: Response) {
        try {
            const { email } = req.body as ForgotPasswordDto;
            await authService.forgotPassword(email);
            return sendResponse(res, 200, "Kode OTP berhasil dikirim ke email Anda");
        } catch (error: any) {
            return sendResponse(res, 400, error.message);
        }
    }

    static async verifyOtp(req: Request, res: Response) {
        try {
            const { email, otp } = req.body as VerifyOtpDto;
            const verifiedUserId = await authService.verifyOtp(email, otp);
            return sendResponse(res, 200, "OTP valid, silakan lanjutkan untuk reset password", {
                user_id: verifiedUserId
            });
        } catch (error: any) {
            return sendResponse(res, 400, error.message);
        }
    }

    static async resetPassword(req: Request, res: Response) {
        try {
            const { id, new_password } = req.body as ResetPasswordDto;
            await authService.resetPassword(id, new_password);
            return sendResponse(res, 200, "Password Anda berhasil diperbarui. Silakan login kembali.");
        } catch (error: any) {
            return sendResponse(res, 400, error.message);
        }
    }
}
