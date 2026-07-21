import { Request, Response } from "express";
import { sendResponse, sendResponseMulti } from "../../utils/response";
import { AuthRequest } from '../../middleware/auth.middleware';
import { GetDlqMessagesUseCase } from "./use-cases/GetDlqMessagesUseCase";
import { RetryDlqMessageUseCase } from "./use-cases/RetryDlqMessageUseCase";
import { RetryAllDlqMessagesUseCase } from "./use-cases/RetryAllDlqMessagesUseCase";
import { PurgeDlqQueueUseCase } from "./use-cases/PurgeDlqQueueUseCase";

export class DLQController {
    static async getDLQMessages(req: AuthRequest, res: Response) {
        try {
            const requestUserId = req.user?.id;
            const requestUserRole = req.user?.role || 'user';

            if (!requestUserId) {
                return sendResponse(res, 401, "User tidak terautentikasi");
            }

            const useCase = new GetDlqMessagesUseCase();
            const messages = await useCase.execute(requestUserId, requestUserRole === 'admin', 100);
            return sendResponseMulti(res, 200, "Daftar antrean gagal berhasil diambil", messages);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async retryDLQMessage(req: AuthRequest, res: Response) {
        try {
            const { id } = req.body;
            if (!id) {
                return sendResponse(res, 400, "Payload ID wajib disertakan");
            }

            const requestUserId = req.user?.id;
            const requestUserRole = req.user?.role || 'user';

            if (!requestUserId) {
                return sendResponse(res, 401, "User tidak terautentikasi");
            }

            const useCase = new RetryDlqMessageUseCase();
            const success = await useCase.execute(String(id), requestUserId, requestUserRole === 'admin');
            if (success) {
                return sendResponse(res, 200, `Pesan dengan ID ${id} berhasil dikirim ulang ke RabbitMQ`);
            } else {
                return sendResponse(res, 404, `Pesan dengan ID ${id} tidak ditemukan di antrean gagal atau Anda tidak memiliki akses.`);
            }
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async retryAllDLQMessages(req: AuthRequest, res: Response) {
        try {
            const requestUserId = req.user?.id;
            const requestUserRole = req.user?.role || 'user';

            if (!requestUserId) {
                return sendResponse(res, 401, "User tidak terautentikasi");
            }

            const useCase = new RetryAllDlqMessagesUseCase();
            const result = await useCase.execute(requestUserId, requestUserRole === 'admin');
            
            return sendResponse(res, 200, `${result.successCount} pesan berhasil dikirim ulang. ${result.skippedCount} pesan dilewati.`);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async purgeDLQ(req: Request, res: Response) {
        try {
            const useCase = new PurgeDlqQueueUseCase();
            await useCase.execute();
            return sendResponse(res, 200, "Seluruh antrean gagal berhasil dibersihkan");
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }
}
