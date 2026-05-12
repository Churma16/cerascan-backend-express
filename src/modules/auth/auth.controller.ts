import {AuthService} from "./auth.service";
import {Request, Response} from "express";
import {sendResponse} from "../../utils/response";
import {AuthRequest} from "../../middleware/auth.guard";


export class AuthController {
    static async register(req: Request, res: Response) {
        try {
            const result = await AuthService.registerUser(req.body);

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

    static async login(req: Request, res: Response) {
        try {
            const {email, password} = req.body;

            if (!email || !password) {
                return res.status(400).json({status: 'error', message: 'Email dan password wajib diisi'});
            }
            const result = await AuthService.loginUser(email, password);

            return sendResponse(res, 201, "Login Berhasil", result)
        } catch (error: any) {

            return sendResponse(res, 401, error.message)
        }
    }

    static async changePassword(req: AuthRequest, res: Response) {
        try {
            const {old_password, new_password} = req.body;
            const userId = req.user?.id;

            if (!userId) {
                return sendResponse(res, 401, "Sesi tidak valid");
            }

            if (!old_password || !new_password) {
                return sendResponse(res, 400, "old_password dan new_password wajib diisi");
            }

            const result = await AuthService.changePassword(userId, old_password, new_password);
            return sendResponse(res, 200, "Password berhasil diganti", result);

        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }
}