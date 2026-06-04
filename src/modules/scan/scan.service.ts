import * as fs from 'node:fs';
import path from 'node:path';
import Scan from '../../models/scan.model';
import {col, fn, literal, Op} from "sequelize";
import {RabbitMQService} from "../rabbitmq/rabbitmq.service";
import {getNowIndonesiaTime} from "../../utils/time.helper";

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
            user_id: userId,

        });

        // 3. Lemparkan ke RabbitMQ!
        await RabbitMQService.publishEvent('scan.process', {
            db_id: newScan.id,
            user_id: userId,
            scan_id: scanId,
            file_path: filePath,
            original_name: originalName
        });

        return newScan;
    }

    static async getHistory(limit: number, userId?: number | null) {
        const whereClause: any = {};

        if (userId === null) {
            whereClause.user_id = null;
        } else if (userId !== undefined) {
            whereClause.user_id = userId;
        }

        const scans = await Scan.findAll({
            where: whereClause,
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

    static async get7DaysScanDataCount(limitDays: number = 7) {
        const now = getNowIndonesiaTime();

        const startDate = new Date(now);
        startDate.setDate(now.getDate() - (limitDays - 1));
        startDate.setHours(0, 0, 0, 0);

        const dbScans: any = await Scan.findAll({
            attributes: [
                [fn('DATE', col('createdAt')), 'date'],
                [fn('COUNT', col('id')), 'total_scan'],
                [literal(`SUM(CASE WHEN prediction != 'normal' THEN 1 ELSE 0 END)`), 'defect_count']
            ],
            where: {
                createdAt: {
                    [Op.gte]: startDate
                }
            },
            group: [fn('DATE', col('createdAt'))],
            order: [[fn('DATE', col('createdAt')), 'ASC']],
            raw: true
        });

        const formatDate = (dateObj: Date) => {
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            return `${month}/${day}`;
        };

        const result: any[] = [];

        for (let i = limitDays - 1; i >= 0; i--) {
            const targetDate = new Date(now);
            targetDate.setDate(now.getDate() - i);
            const dateString = formatDate(targetDate);

            const foundData = dbScans.find((scan: any) => formatDate(new Date(scan.date)) === dateString);

            result.push({
                date: dateString,
                total_scan: foundData ? Number(foundData.total_scan) : 0,
                defect_count: foundData ? String(foundData.defect_count) : "0"
            });
        }

        return result;
    }

}
