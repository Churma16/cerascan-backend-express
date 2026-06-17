import {Request, Response} from "express";
import {sendResponse, sendResponseMulti} from "../../utils/response";
import {DLQService} from "./dlq.service";

export class DLQController {
    static async getDLQMessages(req: Request, res: Response) {
        try {
            const messages = await DLQService.getMessages();
            return sendResponseMulti(res, 200, "Daftar antrean gagal berhasil diambil", messages);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async retryDLQMessage(req: Request, res: Response) {
        try {
            const { id } = req.body;
            if (!id) {
                return sendResponse(res, 400, "Payload ID wajib disertakan");
            }
            const success = await DLQService.retryMessage(String(id));
            if (success) {
                return sendResponse(res, 200, `Pesan dengan ID ${id} berhasil dikirim ulang ke RabbitMQ`);
            } else {
                return sendResponse(res, 404, `Pesan dengan ID ${id} tidak ditemukan di antrean gagal`);
            }
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async purgeDLQ(req: Request, res: Response) {
        try {
            await DLQService.purgeQueue();
            return sendResponse(res, 200, "Seluruh antrean gagal berhasil dibersihkan");
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }
}
