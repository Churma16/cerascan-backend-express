import { Request, Response } from 'express';
import * as fs from 'fs';
import { uploadFileToR2 } from '../../utils/r2.util';
import { sendResponse, sendResponseMulti, sendResponsePaginated } from '../../utils/response';
import { CheckAndDecrementQuotaUseCase } from '../userQuota/use-cases/CheckAndDecrementQuotaUseCase';
import { AuthRequest } from '../../middleware/auth.middleware';

import { ProcessImageUseCase } from './use-cases/ProcessImageUseCase';
import { GetScanHistoryUseCase } from './use-cases/GetScanHistoryUseCase';
import { GetPaginatedScanHistoryUseCase } from './use-cases/GetPaginatedScanHistoryUseCase';
import { DeleteScanUseCase } from './use-cases/DeleteScanUseCase';

/**
 * Controller utama untuk mengelola endpoint pemindaian (scan) gambar kecacatan keramik.
 */
export class ScanController {
    /**
     * Memproses pemindaian satu gambar tunggal.
     * Mengunggah gambar ke R2 storage dan mendaftarkan tugas ke pipeline pemrosesan AI.
     *
     * @async
     * @static
     * @param {AuthRequest} req - Express request dengan data file dan autentikasi pengguna.
     * @param {Response} res - Express response.
     * @returns {Promise<Response>} Response HTTP 202 Accepted jika gambar berhasil diterima.
     */
    static async scanImage(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.id;

            if (!req.file) {
                return sendResponse(res, 404, 'No file found');
            }

            const folderName = process.env.NODE_ENV === 'production' ? 'scans-prod/' : 'scans-dev/';
            const fileBuffer = fs.readFileSync(req.file.path);
            const r2ObjectKey = await uploadFileToR2(fileBuffer, req.file.mimetype, folderName);
            fs.unlinkSync(req.file.path);

            const useCase = new ProcessImageUseCase();
            const results = await useCase.execute(
                userId,
                r2ObjectKey,
                req.file.originalname,
                req.file.filename
            );

            return sendResponse(res, 202, 'Gambar diterima dan sedang diproses oleh AI', results);
        } catch (error: any) {
            console.error('[Scan Error - Single]:', error);
            return sendResponse(res, 500, error.message);
        }
    }

    /**
     * Memproses pemindaian banyak gambar sekaligus (batch upload).
     * Memeriksa dan menguraikan kuota harian pengguna sebelum memasukkan file ke pipeline pemrosesan.
     *
     * @async
     * @static
     * @param {AuthRequest} req - Express request dengan array file dan autentikasi pengguna.
     * @param {Response} res - Express response.
     * @returns {Promise<Response>} Response HTTP 202 Accepted jika batch berhasil diterima, atau 403 jika kuota tidak cukup.
     */
    static async batchScanImages(req: AuthRequest, res: Response) {
        try {
            const files = req.files as Express.Multer.File[];
            if (!files || files.length === 0) {
                return sendResponse(res, 400, 'Tidak ada gambar yang diunggah');
            }

            const userId = req.user?.id;
            const totalImages = files.length;

            const checkAndDecrementQuotaUseCase = new CheckAndDecrementQuotaUseCase();
            const hasQuota = await checkAndDecrementQuotaUseCase.execute(userId, totalImages);
            if (!hasQuota) {
                return sendResponse(
                    res,
                    403,
                    `Sisa kuota harian Anda tidak cukup untuk memindai ${totalImages} gambar sekaligus. Silakan upgrade paket Anda.`
                );
            }

            const pendingScans = [];
            const useCase = new ProcessImageUseCase();
            const folderName = process.env.NODE_ENV === 'production' ? 'scans-prod/' : 'scans-dev/';

            for (const file of files) {
                const fileBuffer = fs.readFileSync(file.path);
                const r2ObjectKey = await uploadFileToR2(fileBuffer, file.mimetype, folderName);
                fs.unlinkSync(file.path);

                const result = await useCase.execute(
                    userId,
                    r2ObjectKey,
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
            console.error('[Scan Error - Batch]:', error);
            return sendResponse(res, 500, error.message);
        }
    }

    /**
     * Mengambil riwayat scan milik pengguna yang sedang terautentikasi (atau semua data jika pengguna adalah admin).
     * Memotong data berdasarkan halaman jika parameter query `page` dispesifikasikan.
     *
     * @async
     * @static
     * @param {AuthRequest} req - Express request terautentikasi dengan opsional query `page` dan `limit`.
     * @param {Response} res - Express response.
     * @returns {Promise<Response>} Response HTTP berisi daftar riwayat scan.
     */
    static async getScanHistory(req: AuthRequest, res: Response) {
        try {
            let userId = req.user?.id;
            if (req.user?.role == 'admin') {
                userId = undefined;
            }

            const page = req.query.page ? parseInt(req.query.page as string) : undefined;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

            if (page !== undefined && !isNaN(page)) {
                const useCase = new GetPaginatedScanHistoryUseCase();
                const result = await useCase.execute(page, limit, userId);
                return sendResponsePaginated(res, 'Scan berhasil', result.rows, result.count, page, limit);
            }

            const useCase = new GetScanHistoryUseCase();
            const history = await useCase.execute(limit, userId);
            return sendResponseMulti(res, 200, 'Scan berhasil', history);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    /**
     * Mengambil riwayat scan publik (scan yang dilakukan oleh pengguna tanpa akun / guest).
     *
     * @async
     * @static
     * @param {Request} req - Express request dengan opsional query `page` dan `limit`.
     * @param {Response} res - Express response.
     * @returns {Promise<Response>} Response HTTP berisi daftar riwayat scan publik.
     */
    static async getPublicScanHistory(req: Request, res: Response) {
        try {
            const page = req.query.page ? parseInt(req.query.page as string) : undefined;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

            if (page !== undefined && !isNaN(page)) {
                const useCase = new GetPaginatedScanHistoryUseCase();
                const result = await useCase.execute(page, limit, null);
                return sendResponsePaginated(res, 'Scan berhasil', result.rows, result.count, page, limit);
            }

            const useCase = new GetScanHistoryUseCase();
            const history = await useCase.execute(limit, null);
            return sendResponseMulti(res, 200, 'Scan berhasil', history);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    /**
     * Menghapus rekaman data scan berdasarkan ID utama. Khusus untuk role Admin.
     *
     * @async
     * @static
     * @param {Request} req - Express request dengan parameter `id`.
     * @param {Response} res - Express response.
     * @returns {Promise<Response>} Response HTTP 200 OK jika berhasil dihapus.
     */
    static async deleteScan(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const scanId = parseInt(id as string);

            if (isNaN(scanId)) {
                return sendResponse(res, 400, 'ID tidak valid');
            }

            const useCase = new DeleteScanUseCase();
            const scanData = await useCase.execute(scanId);

            return sendResponse(res, 200, 'Data scan berhasil dihapus', scanData);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }
}
