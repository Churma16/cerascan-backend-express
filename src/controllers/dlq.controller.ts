import { Request, Response } from "express";
import { sendResponse, sendResponseMulti } from "../utils/response.util";
import { AuthRequest } from "../middleware/auth.middleware";
import { dlqService } from "../services/dlq.service";

export class DLQController {
    static async getDLQMessages(req: AuthRequest, res: Response) {
        try {
            const requestUserId = req.user?.id;
            const requestUserRole = req.user?.role || "user";

            if (!requestUserId) {
                return sendResponse(res, 401, "User tidak terautentikasi");
            }

            const messages = await dlqService.getDlqMessages(requestUserId, requestUserRole === "admin", 100);
            return sendResponseMulti(res, 200, "Daftar antrean gagal berhasil diambil", messages);
        } catch (error: any) {
            if (error.message?.includes("403") || error.statusCode === 403) {
                return sendResponse(res, 403, error.message);
            }
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
            const requestUserRole = req.user?.role || "user";

            if (!requestUserId) {
                return sendResponse(res, 401, "User tidak terautentikasi");
            }

            const success = await dlqService.retryDlqMessage(String(id), requestUserId, requestUserRole === "admin");
            if (success) {
                return sendResponse(res, 200, `Pesan dengan ID ${id} berhasil dikirim ulang ke RabbitMQ`);
            } else {
                return sendResponse(res, 404, `Pesan dengan ID ${id} tidak ditemukan di antrean gagal atau Anda tidak memiliki akses.`);
            }
        } catch (error: any) {
            if (error.message?.includes("403") || error.statusCode === 403) {
                return sendResponse(res, 403, error.message);
            }
            return sendResponse(res, 500, error.message);
        }
    }

    static async retryAllDLQMessages(req: AuthRequest, res: Response) {
        try {
            const requestUserId = req.user?.id;
            const requestUserRole = req.user?.role || "user";

            if (!requestUserId) {
                return sendResponse(res, 401, "User tidak terautentikasi");
            }

            const result = await dlqService.retryAllDlqMessages(requestUserId, requestUserRole === "admin");
            return sendResponse(res, 200, `${result.successCount} pesan berhasil dikirim ulang. ${result.skippedCount} pesan dilewati.`);
        } catch (error: any) {
            if (error.message?.includes("403") || error.statusCode === 403) {
                return sendResponse(res, 403, error.message);
            }
            return sendResponse(res, 500, error.message);
        }
    }

    static async purgeDLQ(req: Request, res: Response) {
        try {
            await dlqService.purgeDlq();
            return sendResponse(res, 200, "Seluruh antrean gagal berhasil dibersihkan");
        } catch (error: any) {
            if (error.message?.includes("403") || error.statusCode === 403) {
                return sendResponse(res, 403, error.message);
            }
            return sendResponse(res, 500, error.message);
        }
    }
}
