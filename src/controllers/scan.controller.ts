import { Request, Response } from "express";
import { scanService } from "../services/scan.service";
import { sendResponse, sendResponseMulti, sendResponsePaginated } from "../utils/response";
import { AuthRequest } from "../middleware/auth.middleware";

export class ScanController {
    static async scanImage(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.id;

            if (!req.file) {
                return sendResponse(res, 404, "No file found");
            }

            const scanResult = await scanService.initiateSingleScan({
                userId,
                file: req.file
            });

            return sendResponse(res, 202, "Gambar diterima dan sedang diproses oleh AI", scanResult);
        } catch (error: any) {
            console.error("[Scan Error - Single]:", error);
            return sendResponse(res, 500, error.message);
        }
    }

    static async batchScanImages(req: AuthRequest, res: Response) {
        try {
            const files = req.files as Express.Multer.File[];
            if (!files || files.length === 0) {
                return sendResponse(res, 400, "Tidak ada gambar yang diunggah");
            }

            const userId = req.user?.id;
            const batchResult = await scanService.initiateBatchScans(userId, files);

            if (batchResult.quotaExceeded) {
                return sendResponse(
                    res,
                    403,
                    `Sisa kuota harian Anda tidak cukup untuk memindai ${files.length} gambar sekaligus. Silakan upgrade paket Anda.`
                );
            }

            return sendResponse(
                res,
                202,
                `${files.length} gambar diterima dan sedang antre diproses AI`,
                batchResult.pendingScans
            );
        } catch (error: any) {
            console.error("[Scan Error - Batch]:", error);
            return sendResponse(res, 500, error.message);
        }
    }

    static async getScanHistory(req: AuthRequest, res: Response) {
        try {
            let userId = req.user?.id;
            if (req.user?.role === "admin") {
                userId = undefined;
            }

            const page = req.query.page ? parseInt(req.query.page as string) : undefined;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

            const result = await scanService.getScanHistory(limit, userId, page);

            if (page !== undefined && !isNaN(page) && "rows" in result) {
                return sendResponsePaginated(res, "Scan berhasil", result.rows, result.count, page, limit);
            }

            return sendResponseMulti(res, 200, "Scan berhasil", result as any[]);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async getPublicScanHistory(req: Request, res: Response) {
        try {
            const page = req.query.page ? parseInt(req.query.page as string) : undefined;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

            const result = await scanService.getScanHistory(limit, null, page);

            if (page !== undefined && !isNaN(page) && "rows" in result) {
                return sendResponsePaginated(res, "Scan berhasil", result.rows, result.count, page, limit);
            }

            return sendResponseMulti(res, 200, "Scan berhasil", result as any[]);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async deleteScan(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const scanId = parseInt(id as string);

            if (isNaN(scanId)) {
                return sendResponse(res, 400, "ID tidak valid");
            }

            const isDeleted = await scanService.deleteScanById(scanId);

            if (!isDeleted) {
                return sendResponse(res, 404, "Data scan tidak ditemukan");
            }

            return sendResponse(res, 200, "Data scan berhasil dihapus");
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }
}
