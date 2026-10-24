import * as fs from "fs";
import { scanRepository, ScanRepository } from "../repositories/scan.repository";
import { generateId } from "../utils/generator";
import { uploadFileToR2 } from "../utils/r2.util";
import { RabbitmqPublisher } from "../transport/rabbitmq/infrastructure/rabbitmq.publisher";
import { quotaService } from "./quota.service";
import { Scan } from "../models";

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
        const r2ObjectKey = await uploadFileToR2(fileBuffer, input.file.mimetype, folderName);
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
            // Clean up any uploaded temp files if quota exceeded
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
            const r2ObjectKey = await uploadFileToR2(fileBuffer, file.mimetype, folderName);

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

    async getScanHistory(
        limit: number = 50,
        userId?: number | null,
        page?: number
    ): Promise<Scan[] | PaginatedResult<Scan>> {
        const whereClause: any = {};
        if (userId !== undefined) {
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

            return {
                rows: paginatedResults.rows,
                count: paginatedResults.count,
                page,
                limit
            };
        }

        return await this.repository.findAll({
            where: whereClause,
            order: [["created_at", "DESC"]],
            limit
        });
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
