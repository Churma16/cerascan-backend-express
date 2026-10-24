import { Request, Response } from "express";
import { authService, AuthService } from "../services/auth.service";
import { sendResponse } from "../utils/response.util";
import { AuthRequest } from "../middleware/auth.middleware";
import { UserAttributes } from "../models/user.model";
import { log } from "../utils/logger.util";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

export class AuthController {
    private service: AuthService;

    constructor(service: AuthService = authService) {
        this.service = service;
    }

    register = async (req: Request, res: Response): Promise<void> => {
        try {
            const registeredUser = await this.service.register(req.body);
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
    };

    registerV2 = async (req: Request, res: Response): Promise<void> => {
        try {
            const registeredUser = await this.service.registerV2(req.body);
            sendResponse(res, 201, "Registrasi berhasil", registeredUser);
        } catch (error: any) {
            sendResponse(res, 500, error.message);
        }
    };

    verifyEmail = async (req: Request, res: Response): Promise<void> => {
        try {
            const { token } = req.query;
            if (!token) {
                sendResponse(res, 400, "Token verifikasi tidak ditemukan");
                return;
            }

            await this.service.verifyEmail(token as string);
            sendResponse(res, 200, "Email Anda berhasil diverifikasi");
        } catch (error: any) {
            sendResponse(res, 400, error.message);
        }
    };

    login = async (req: Request, res: Response): Promise<void> => {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                res.status(400).json({
                    status: "error",
                    message: "Email dan password wajib diisi"
                });
                return;
            }

            const loginResult = await this.service.login(email, password);
            sendResponse(res, 201, "Login Berhasil", loginResult);
        } catch (error: any) {
            sendResponse(res, 401, error.message);
        }
    };

    googleCallback = async (req: Request, res: Response): Promise<void> => {
        const authenticatedUser = req.user as UserAttributes;
        if (!authenticatedUser) {
            res.redirect(`${FRONTEND_URL}/login?error=auth_failed`);
            return;
        }

        const authToken = this.service.buildAuthToken(authenticatedUser);
        res.redirect(`${FRONTEND_URL}/auth/callback?token=${authToken}`);
    };

    changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const { old_password, new_password } = req.body;
            const authenticatedUserId = req.user?.id;

            if (!authenticatedUserId) {
                sendResponse(res, 401, "Sesi tidak valid");
                return;
            }

            if (!old_password || !new_password) {
                sendResponse(res, 400, "old_password dan new_password wajib diisi");
                return;
            }

            await this.service.changePassword(authenticatedUserId, old_password, new_password);
            sendResponse(res, 200, "Password berhasil diganti", true);
        } catch (error: any) {
            sendResponse(res, 500, error.message);
        }
    };

    forgotPassword = async (req: Request, res: Response): Promise<void> => {
        try {
            const { email } = req.body;
            if (!email) {
                sendResponse(res, 400, "Email wajib diisi");
                return;
            }

            await this.service.forgotPassword(email);
            sendResponse(res, 200, "Kode OTP berhasil dikirim ke email Anda");
        } catch (error: any) {
            sendResponse(res, 400, error.message);
        }
    };

    verifyOtp = async (req: Request, res: Response): Promise<void> => {
        try {
            const { email, otp } = req.body;
            if (!email || !otp) {
                sendResponse(res, 400, "Email dan OTP wajib diisi");
                return;
            }

            const verifiedUserId = await this.service.verifyOtp(email, otp);
            sendResponse(res, 200, "OTP valid, silakan lanjutkan untuk reset password", {
                user_id: verifiedUserId
            });
        } catch (error: any) {
            sendResponse(res, 400, error.message);
        }
    };

    resetPassword = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id, new_password } = req.body;
            if (!id || !new_password) {
                sendResponse(res, 400, "ID pengguna dan password baru wajib diisi");
                return;
            }

            await this.service.resetPassword(Number(id), new_password);
            sendResponse(res, 200, "Password Anda berhasil diperbarui. Silakan login kembali.");
        } catch (error: any) {
            sendResponse(res, 400, error.message);
        }
    };
}

export const authController = new AuthController();
