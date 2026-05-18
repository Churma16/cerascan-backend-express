import * as fs from 'node:fs';
import path from 'node:path';
import axios from 'axios';
import Scan from '../../models/scan.model';
import {col, fn, literal, Op} from "sequelize";

export class ScanService {
    static async processImage(filePath: string, originalName: string, savedFileName: string) {
        const startTime = Date.now();
        try {
            const fileBuffer = fs.readFileSync(filePath);
            const blob = new Blob([fileBuffer], {type: 'image/jpeg'});

            const formData = new FormData();
            formData.append('file', blob, originalName);

            const microserviceUrl = process.env.MICROSERVICES_URL || 'http://127.0.0.1:8000';
            const pythonResponse = await axios.post(microserviceUrl + '/predict', formData, {
                headers: {'Content-Type': 'multipart/form-data'},
            });

            const endTime = Date.now();
            const inferenceTimeMs = endTime - startTime;

            const result = pythonResponse.data;

            const ScanCount = await Scan.count();
            const scanId = '#SCN-' + String(ScanCount + 1).padStart(4, '0');

            const newScan = await Scan.create({
                scan_id: scanId,
                file_name: originalName,
                saved_file_name: savedFileName,
                prediction: result.prediction,
                confidence: result.confidence_score,
                inference_time: `${inferenceTimeMs}ms`,
            });

            // fs.unlinkSync(filePath);

            return newScan;
        } catch (error: any) {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            throw new Error('Gagal memproses gambar ke server AI: ' + error.message);
        }
    }

    static async getHistory(limit: number) {
        const scans = await Scan.findAll({
            order: [['createdAt', 'DESC']],
            limit: limit,
        });

        return scans;
    }

    static async deleteScan(scanId: number) {
        const scan = await Scan.findOne({
            where: {
                id: scanId,
            },
        });

        if (!scan) {
            throw new Error('Data scan tidak ditemukan');
        }

        if (scan.saved_file_name) {
            const uploadsDir = path.join(__dirname, '../../uploads');
            const filePath = path.join(uploadsDir, scan.saved_file_name);
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch (error: any) {
                console.error('Error deleting file:', error.message);
            }
        }

        await scan.destroy();
        return scan;
    }

    static async get7DaysScanDataCount() {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const scans = await Scan.findAll({
            attributes: [
                [fn('DATE', col('createdAt')), 'date'],
                [fn('COUNT', col('id')), 'total_scan'],
                [
                    literal(`SUM(CASE WHEN prediction != 'normal' THEN 1 ELSE 0 END)`),
                    'defect_count'
                ]
            ],
            where: {
                createdAt: {
                    [Op.gte]: sevenDaysAgo
                }
            },
            group: [fn('DATE', col('createdAt'))],
            order: [[fn('DATE', col('createdAt')), 'ASC']],
            raw: true
        });

        return scans;
    }

}
