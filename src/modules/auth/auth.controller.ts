import {AuthService} from "./auth.service";
import {Request, Response} from "express";
import {sendResponse} from "../../utils/response";


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
}