import * as fs from "fs";
import { col, fn, literal, Op } from "sequelize";
import { scanRepository, ScanRepository } from "../repositories/scan.repository";
import { generateId } from "../utils/generator.util";
import { storageService } from "./storage.service";
import { RabbitmqPublisher } from "../transport/rabbitmq/infrastructure/rabbitmq.publisher";
import { quotaService } from "./quota.service";
import { Scan } from "../models";
import { getNowIndonesiaTime } from "../utils/time.helper";

export interface InitiateSingleScanInput {
    userId: number | undefined;
    file: Express.Multer.File;
    folderName?: string;
}

export interface PaginatedResult<T> {
    rows: T[];
    count: number;
    page: number;
    limit: number;
}

export interface GetScanHistoryOptions {
    limit?: number;
    userId?: number | null;
    page?: number;
}

export class ScanService {
    private repository: ScanRepository;

    constructor(customRepository: ScanRepository = scanRepository) {
        this.repository = customRepository;
    }

    private generateScanIdentifier(): string {
        return `#SCN-${generateId()}`;
    }

    private extractFileBuffer(file: Express.Multer.File): Buffer {
        if (file.buffer) {
            return file.buffer;
        }
        if (file.path && fs.existsSync(file.path)) {
            const buffer = fs.readFileSync(file.path);
            try {
                fs.unlinkSync(file.path);
            } catch (unlinkError) {
                console.error("[warn] Failed to remove temporary file:", file.path, unlinkError);
            }
            return buffer;
        }
        throw new Error("File buffer or path not accessible.");
    }

    async initiateSingleScan(input: InitiateSingleScanInput): Promise<Scan> {
        const folderName = input.folderName || (process.env.NODE_ENV === "production" ? "scans-prod/" : "scans-dev/");
        const fileBuffer = this.extractFileBuffer(input.file);
        const r2ObjectKey = await storageService.uploadFile(fileBuffer, input.file.mimetype, folderName);
        const scanIdentifier = this.generateScanIdentifier();

        const createdScan = await this.repository.create({
            scan_id: scanIdentifier,
            file_name: input.file.originalname,
            saved_file_name: r2ObjectKey,
            prediction: "processing",
            confidence: 0,
            inference_time: "0ms",
            user_id: input.userId
        });

        await RabbitmqPublisher.publishEvent("scan.process", {
            db_id: createdScan.id,
            user_id: input.userId,
            scan_id: scanIdentifier,
            r2_object_key: r2ObjectKey,
            original_name: input.file.originalname
        });

        return createdScan;
    }

    async initiateBatchScans(
        userId: number | undefined,
        files: Express.Multer.File[]
    ): Promise<{ pendingScans: Scan[]; quotaExceeded: boolean }> {
        const totalImages = files.length;
        const hasAvailableQuota = await quotaService.checkAndDecrementQuota(userId, totalImages);

        if (!hasAvailableQuota) {
            for (const file of files) {
                if (file.path && fs.existsSync(file.path)) {
                    try {
                        fs.unlinkSync(file.path);
                    } catch (_) {}
                }
            }
            return { pendingScans: [], quotaExceeded: true };
        }

        const pendingScans: Scan[] = [];
        const folderName = process.env.NODE_ENV === "production" ? "scans-prod/" : "scans-dev/";

        for (const file of files) {
            const fileBuffer = this.extractFileBuffer(file);
            const scanIdentifier = this.generateScanIdentifier();
            const r2ObjectKey = await storageService.uploadFile(fileBuffer, file.mimetype, folderName);

            const createdScan = await this.repository.create({
                scan_id: scanIdentifier,
                file_name: file.originalname,
                saved_file_name: r2ObjectKey,
                prediction: "processing",
                confidence: 0,
                inference_time: "0ms",
                user_id: userId
            });

            await RabbitmqPublisher.publishEvent("scan.process", {
                db_id: createdScan.id,
                user_id: userId,
                scan_id: scanIdentifier,
                r2_object_key: r2ObjectKey,
                original_name: file.originalname
            });

            pendingScans.push(createdScan);
        }

        return { pendingScans, quotaExceeded: false };
    }

    async getScanHistory(options: GetScanHistoryOptions = {}): Promise<any[] | PaginatedResult<any>> {
        const { limit = 50, userId, page } = options;
        const whereClause: any = {};
        if (userId !== undefined && userId !== null) {
            whereClause.user_id = userId;
        }

        if (page !== undefined && !isNaN(page)) {
            const offset = (page - 1) * limit;
            const paginatedResults = await this.repository.findAndCountAll({
                where: whereClause,
                order: [["created_at", "DESC"]],
                limit,
                offset
            });

            const enrichedRows = await Promise.all(
                paginatedResults.rows.map(scan => this.attachFileUrl(scan))
            );

            return {
                rows: enrichedRows,
                count: paginatedResults.count,
                page,
                limit
            };
        }

        const scans = await this.repository.findAll({
            where: whereClause,
            order: [["created_at", "DESC"]],
            limit
        });

        return await Promise.all(scans.map(scan => this.attachFileUrl(scan)));
    }

    private async attachFileUrl(scan: Scan): Promise<any> {
        const scanJson: any = typeof scan.toJSON === "function" ? scan.toJSON() : { ...scan };
        if (scanJson.saved_file_name && scanJson.saved_file_name.includes("scans-")) {
            scanJson.file_url = await storageService.getPresignedUrl(scanJson.saved_file_name);
        } else if (scanJson.saved_file_name) {
            scanJson.file_url = `${process.env.BACKEND_URL || "http://localhost:3000"}/uploads/${scanJson.saved_file_name}`;
        }
        return scanJson;
    }

    async getScanTrend(
        limitDays: number = 7,
        userId?: number,
        userRole?: string
    ): Promise<Array<{ date: string; total_scan: number; defect_count: number }>> {
        const now = getNowIndonesiaTime();
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

            if (userRole && userRole !== "admin" && userId) {
                whereClause.user_id = userId;
            }

            dbScans = await this.repository.findAll({
                attributes: [
                    [fn("DATE", col("createdAt")), "date"],
                    [fn("COUNT", col("id")), "total_scan"],
                    [literal(`SUM(CASE WHEN prediction != 'normal' THEN 1 ELSE 0 END)`), "defect_count"]
                ],
                where: whereClause,
                group: [fn("DATE", col("createdAt"))],
                order: [[fn("DATE", col("createdAt")), "ASC"]],
                raw: true
            } as any);
        } catch (error) {
            console.error("Failed to query scan data trend, using empty list fallback:", error);
            dbScans = [];
        }

        const result: Array<{ date: string; total_scan: number; defect_count: number }> = [];

        for (let i = limitDays - 1; i >= 0; i--) {
            const targetDate = new Date(now);
            targetDate.setDate(now.getDate() - i);
            const dateString = this.formatDateMMDD(targetDate);

            const foundData = dbScans.find((scan: any) => {
                if (!scan || !scan.date) return false;
                const parts = String(scan.date).split(/[-/]/);
                if (parts.length >= 3) {
                    let monthStr = "";
                    let dayStr = "";
                    if (parts[0].length === 4) {
                        monthStr = parts[1].padStart(2, "0");
                        dayStr = parts[2].substring(0, 2).padStart(2, "0");
                    } else if (parts[2].length === 4) {
                        monthStr = parts[0].padStart(2, "0");
                        dayStr = parts[1].padStart(2, "0");
                    }
                    if (monthStr && dayStr) {
                        return `${monthStr}/${dayStr}` === dateString;
                    }
                }
                try {
                    return this.formatDateMMDD(new Date(scan.date)) === dateString;
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

    private formatDateMMDD(dateObj: Date): string {
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        const day = String(dateObj.getDate()).padStart(2, "0");
        return `${month}/${day}`;
    }

    async deleteScanById(scanId: number): Promise<boolean> {
        return await this.repository.destroy(scanId);
    }

    async markScanAsSuccess(
        dbId: number,
        prediction: string,
        confidenceScore: number,
        inferenceTime: string
    ): Promise<number> {
        return await this.repository.update(dbId, {
            prediction,
            confidence: confidenceScore,
            inference_time: inferenceTime
        });
    }

    async markScanAsFailed(dbId: number): Promise<number> {
        return await this.repository.update(dbId, {
            prediction: "failed"
        });
    }

    async recordScanAnalytics(payload: {
        scan_id: string;
        user_id: number;
        prediction: string;
        confidence_score: number;
        inference_time: number;
    }): Promise<void> {
        await this.repository.recordAnalytics(payload);

        const isDefect = ["crack", "scratch", "stain"].includes((payload.prediction || "").toLowerCase());
        await this.repository.incrementScanKpi(payload.user_id || 0, payload.confidence_score, isDefect);
    }
}

export const scanService = new ScanService();
