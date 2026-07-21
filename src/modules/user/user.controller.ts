import { Request, Response } from "express";
import { AuthRequest } from '../../middleware/auth.middleware';
import { sendResponse, sendResponseMulti } from "../../utils/response";
import { SequelizeUserRepository } from "./infrastructure/SequelizeUserRepository";
import { UpdateUserUseCase } from "./use-cases/UpdateUserUseCase";

const userRepository = new SequelizeUserRepository();

export class UserController {
    static async getAll(req: Request, res: Response) {
        try {
            const users = await userRepository.findAll();
            return sendResponseMulti(res, 200, "Daftar pengguna berhasil diambil", users);
        } catch (error: any) {
            return sendResponse(res, 401, error.message || "Unauthorized");
        }
    }

    static async getById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const userId = parseInt(id as string);
            if (isNaN(userId)) {
                return sendResponse(res, 400, "ID tidak valid");
            }

            const user = await userRepository.findById(userId);
            if (!user) {
                return sendResponse(res, 404, "Data pengguna tidak ditemukan");
            }
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

            const user = await userRepository.findById(userId);
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
            const { id } = req.params;
            const userId = parseInt(id as string);
            if (isNaN(userId)) {
                return sendResponse(res, 400, "ID tidak valid");
            }

            const useCase = new UpdateUserUseCase();
            const user = await useCase.execute(userId, req.body);
            return sendResponse(res, 200, "Pengguna berhasil diperbarui", user);
        } catch (error: any) {
            return sendResponse(res, 500, error.message || "Terjadi kesalahan pada server");
        }
    }

    static async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const userId = parseInt(id as string);
            if (isNaN(userId)) {
                return sendResponse(res, 400, "ID tidak valid");
            }

            const user = await userRepository.findById(userId);
            if (!user) {
                return sendResponse(res, 404, "User tidak ditemukan");
            }
            await userRepository.destroy(userId);
            return sendResponse(res, 200, "Pengguna berhasil dihapus", user);
        } catch (error: any) {
            return sendResponse(res, 500, error.message || "Terjadi kesalahan pada server");
        }
    }
}
