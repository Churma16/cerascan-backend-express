import {UserService} from "./user.service";
import {sendResponse, sendResponseMulti} from "../../utils/response";
import {Request, Response} from "express";
import {AuthRequest} from "../../middleware/auth.guard";

export class UserController {
    static async getAll(req: Request, res: Response) {
        try {
            const users = await UserService.getAllUsers();
            return sendResponseMulti(res, 200, "Daftar pengguna berhasil diambil", users);

        } catch (error: any) {
            return sendResponse(res, 401, error);
        }
    }

    static async getById(req: Request, res: Response) {
        try {
            const {id} = req.params;
            const userId = parseInt(id as string);
            if (isNaN(userId)) {
                return sendResponse(res, 400, "ID tidak valid");
            }

            const user = await UserService.getUserById(userId);
            return sendResponse(res, 200, "Pengguna berhasil diambil", user);

        } catch (error: any) {
            return sendResponse(res, 500, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async getMe(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return sendResponse(res, 401, "Sesi tidak valid atau pengguna tidak dikenali");
            }

            const user = await UserService.getUserById(userId);
            if (!user) {
                return sendResponse(res, 404, "Data pengguna tidak ditemukan");
            }

            return sendResponse(res, 200, "Profil berhasil diambil", user);

        } catch (error: any) {
            return sendResponse(res, 500, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async update(req: Request, res: Response) {
        try {
            const {id} = req.params;
            const userId = parseInt(id as string);
            if (isNaN(userId)) {
                return sendResponse(res, 400, "ID tidak valid");
            }

            const user = await UserService.updateUser(userId, req.body);
            return sendResponse(res, 200, "Pengguna berhasil diperbarui", user);
        } catch (error: any) {
            return sendResponse(res, 500, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async delete(req: Request, res: Response) {
        try {
            const {id} = req.params;
            const userId = parseInt(id as string);
            if (isNaN(userId)) {
                return sendResponse(res, 400, "ID tidak valid");
            }

            const user = await UserService.deleteUser(userId);
            return sendResponse(res, 200, "Pengguna berhasil dihapus", user);
        } catch (error: any) {
            return sendResponse(res, 500, error);
        }
    }
}