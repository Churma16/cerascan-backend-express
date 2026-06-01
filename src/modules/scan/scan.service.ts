import * as fs from 'node:fs';
import path from 'node:path';
import Scan from '../../models/scan.model';
import {col, fn, literal, Op} from "sequelize";
import {RabbitMQService} from "../rabbitmq/rabbitmq.service";

export class ScanService {
    static async processImage(userId: number | undefined, filePath: string, originalName: string, savedFileName: string) {
        // 1. Hitung ID
        const ScanCount = await Scan.count();
        const scanId = '#SCN-' + String(ScanCount + 1).padStart(4, '0');

        // 2. Insert ke Database (Status masih pending)
        const newScan = await Scan.create({
            scan_id: scanId,
            file_name: originalName,
            saved_file_name: savedFileName,
            prediction: 'processing', // Sedang diproses!
            confidence: 0,
            inference_time: '0ms',
        });

        // 3. Lemparkan ke RabbitMQ!
        await RabbitMQService.publishEvent('scan.process', {
            db_id: newScan.id,
            user_id: userId,
            scan_id: scanId,
            file_path: filePath,
            original_name: originalName
        });

        // 4. Langsung return ke Controller (super cepat!)
        return newScan;
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
