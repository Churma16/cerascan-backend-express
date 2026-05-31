import {Request, Response} from 'express';
import {sendResponse, sendResponseMulti} from '../../utils/response';
import {ScanService} from './scan.service';
import {UserQuotaService} from "../user_quota/user_quota.service";
import {AuthRequest} from "../../middleware/auth.guard";

export class ScanController {
    static async scanImage(req: Request, res: Response) {
        try {
            if (!req.file) {
                return sendResponse(res, 404, 'No file found');
            }

            const results = await ScanService.processImage(
                req.file.path,
                req.file.originalname,
                req.file.filename
            );

            return sendResponse(res, 202, 'Gambar diterima dan sedang diproses oleh AI', results);

        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async batchScanImages(req: AuthRequest, res: Response) {
        try {
            const files = req.files as Express.Multer.File[];
            if (!files || files.length === 0) {
                return sendResponse(res, 400, 'Tidak ada gambar yang diunggah');
            }

            const userId = req.user?.id;
            const totalImages = files.length;

            const hasQuota = await UserQuotaService.checkAndDecrementQuota(userId, totalImages);

            if (!hasQuota) {
                return sendResponse(
                    res,
                    403,
                    `Sisa kuota harian Anda tidak cukup untuk memindai ${totalImages} gambar sekaligus. Silakan upgrade paket Anda.`
                );
            }

            const pendingScans = [];

            for (const file of files) {
                const result = await ScanService.processImage(
                    file.path,
                    file.originalname,
                    file.filename
                );
                pendingScans.push(result);
            }

            return sendResponse(
                res,
                202,
                `${files.length} gambar diterima dan sedang antre diproses AI`,
                pendingScans
            );

        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async getScanHistory(req: Request, res: Response) {
        try {
            const history = await ScanService.getHistory(50);
            return sendResponseMulti(res, 200, 'Scan berhasil', history);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async deleteScan(req: Request, res: Response) {
        try {
            const {id} = req.params;
            const scanId = parseInt(id as string);

            if (isNaN(scanId)) {
                return sendResponse(res, 400, 'ID tidak valid');
            }

            const scanData = await ScanService.deleteScan(scanId);

            return sendResponse(res, 200, 'Data scan berhasil dihapus', scanData);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }


}
