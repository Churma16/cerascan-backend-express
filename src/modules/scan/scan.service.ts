import * as fs from 'node:fs';
import path from 'node:path';
import axios from 'axios';
import Scan from '../../models/scan.model';
import {col, fn, literal, Op} from "sequelize";
import {RabbitMQService} from "../rabbitmq/rabbitmq.service";
import {getNowIndonesiaTime} from "../../utils/time.helper";

export class ScanService {
    static async processImage(userId: number | undefined, filePath: string, originalName: string, savedFileName: string) {
        const ScanCount = await Scan.count();
        const scanId = '#SCN-' + String(ScanCount + 1).padStart(4, '0');

        const newScan = await Scan.create({
            scan_id: scanId,
            file_name: originalName,
            saved_file_name: savedFileName,
            prediction: 'processing',
            confidence: 0,
            inference_time: '0ms',
            user_id: userId,

        });

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

    static async getScanDataCountSince(limitDays: number = 7, userId?: number, userRole?: string) {
        const now = getNowIndonesiaTime();
        const formatDate = (dateObj: Date) => {
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            return `${month}/${day}`;
        };

        let dbScans: any[] = [];
        try {
            const startDate = new Date(now);
            startDate.setDate(now.getDate() - (limitDays - 1));
            startDate.setHours(0, 0, 0, 0);

            const whereClause: any = {
                createdAt: {
                    [Op.gte]: startDate
                }
            };

            if (userRole && userRole !== 'admin' && userId) {
                whereClause.user_id = userId;
            }

            dbScans = await Scan.findAll({
                attributes: [
                    [fn('DATE', col('createdAt')), 'date'],
                    [fn('COUNT', col('id')), 'total_scan'],
                    [literal(`SUM(CASE WHEN prediction != 'normal' THEN 1 ELSE 0 END)`), 'defect_count']
                ],
                where: whereClause,
                group: [fn('DATE', col('createdAt'))],
                order: [[fn('DATE', col('createdAt')), 'ASC']],
                raw: true
            });
        } catch (error) {
            console.error("Failed to query scan data trend, using empty list fallback:", error);
            dbScans = [];
        }

        const result: any[] = [];

        for (let i = limitDays - 1; i >= 0; i--) {
            const targetDate = new Date(now);
            targetDate.setDate(now.getDate() - i);
            const dateString = formatDate(targetDate);

            const foundData = dbScans.find((scan: any) => {
                if (!scan || !scan.date) return false;
                const parts = String(scan.date).split(/[-/]/);
                if (parts.length >= 3) {
                    let monthStr = "";
                    let dayStr = "";
                    if (parts[0].length === 4) {
                        monthStr = parts[1].padStart(2, '0');
                        dayStr = parts[2].substring(0, 2).padStart(2, '0');
                    } else if (parts[2].length === 4) {
                        monthStr = parts[0].padStart(2, '0');
                        dayStr = parts[1].padStart(2, '0');
                    }
                    if (monthStr && dayStr) {
                        return `${monthStr}/${dayStr}` === dateString;
                    }
                }
                try {
                    return formatDate(new Date(scan.date)) === dateString;
                } catch {
                    return false;
                }
            });

            result.push({
                date: dateString,
                total_scan: foundData ? Number(foundData.total_scan) : 0,
                defect_count: foundData ? Number(foundData.defect_count) : 0
            });
        }

        return result;
    }

    static async UpdateScanById(taskData: any) {
        await Scan.update({
            prediction: 'failed',
        }, {
            where: {id: taskData.db_id}
        });
    }

    static async predictImage(filePath: string, originalName: string) {
        const fileBuffer = fs.readFileSync(filePath);
        const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
        const formData = new FormData();
        formData.append('file', blob, originalName);

        const microserviceUrl = process.env.MICROSERVICES_URL || 'http://127.0.0.1:8000';
        
        const response = await axios.post(`${microserviceUrl}/predict`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        
        return response.data;
    }

    static async updateScanSuccess(dbId: number, prediction: string, confidence: number, inferenceTime: string, userId?: number) {
        await Scan.update({
            prediction,
            confidence,
            inference_time: inferenceTime,
            user_id: userId,
        }, {
            where: { id: dbId }
        });
    }

}
