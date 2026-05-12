import {Request, Response} from 'express';
import {sendResponse, sendResponseMulti} from '../../utils/response';
import {ScanService} from './scan.service';

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

            return sendResponse(res, 200, 'Scan berhasil', results);
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

    static async getLatestScanDataTrend(req: Request, res: Response) {
        try {

            const result = await ScanService.get7DaysScanDataCount()
            return sendResponseMulti(res, 200, 'Scan berhasil', result);
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }

    }
}
