import { Request, Response } from "express";
import http from "http";
import fs from "fs";
import path from "path";
import axios from "axios";
import dayjs from "dayjs";
import { fn, col, Op, literal, Transaction } from "sequelize";
import { sendResponse } from "../utils/response.util";
import { AuthRequest } from "../middleware/auth.middleware";
import { PythonMlGrpcClient } from "../services/pythonMlGrpc.service";
import Scan from "../models/scan.model";
import { userRepository } from "../repositories/user.repository";
import { scanRepository } from "../repositories/scan.repository";
import { getNowIndonesiaTime } from "../utils/time.util";
import { calculateTrendPercentageText } from "../queries/dashboard/dashboardKpi.types";
import sequelize from "../config/databaseClient";
import { getRedisClient } from "../config/redisClient";
import { UserQuotaModel } from "../models";
import { quotaService } from "../services/quota.service";

const restKeepAliveAgent = new http.Agent({ keepAlive: true, maxSockets: 25 });

interface InProcessJob {
    id: string;
    fileBuffer: Buffer;
    fileName: string;
    receivedAt: number;
}

const inProcessJobQueue: InProcessJob[] = [];
let isProcessingInProcessQueue = false;

interface InProcessCacheEntry<T> {
    data: T;
    expiresAt: number;
}
const localMemoryCache = new Map<string, InProcessCacheEntry<any>>();

function getFromLocalCache<T>(key: string): T | null {
    const entry = localMemoryCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        localMemoryCache.delete(key);
        return null;
    }
    return entry.data;
}

function setToLocalCache<T>(key: string, data: T, ttlSeconds: number = 60): void {
    localMemoryCache.set(key, {
        data,
        expiresAt: Date.now() + (ttlSeconds * 1000)
    });
}

async function processInProcessQueue() {
    if (isProcessingInProcessQueue || inProcessJobQueue.length === 0) return;
    isProcessingInProcessQueue = true;

    while (inProcessJobQueue.length > 0) {
        const job = inProcessJobQueue.shift();
        if (job) {
            try {
                await PythonMlGrpcClient.predictImage(job.fileBuffer, job.fileName);
            } catch (err) {
                // in-process job failure
            }
        }
    }

    isProcessingInProcessQueue = false;
}

export class BaselineController {
    /**
     * Baseline 01: Direct Synchronous Scan (RabbitMQ Alternative)
     * Express directly awaits Python ML inference synchronously (~1-2s)
     * without queueing to RabbitMQ. Proves connection starvation under load.
     */
    static async syncScanImage(req: AuthRequest, res: Response): Promise<Response> {
        try {
            if (!req.file) {
                return sendResponse(res, 400, "Tidak ada file gambar yang diunggah");
            }

            const startTime = Date.now();
            const originalFilename = req.file.originalname || "baseline_tile.png";
            const imageBuffer = req.file.buffer;

            // Direct synchronous gRPC prediction call within HTTP request lifecycle
            const predictionResult = await PythonMlGrpcClient.predictImage(imageBuffer, originalFilename);
            const inferenceDurationMs = Date.now() - startTime;

            const randomScanSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
            const scanTrackingId = `#BLS-${randomScanSuffix}`;

            const createdScan = await Scan.create({
                scan_id: scanTrackingId,
                file_name: originalFilename,
                saved_file_name: `baseline-sync/${originalFilename}`,
                prediction: predictionResult.prediction,
                confidence: predictionResult.confidence_score,
                inference_time: `${inferenceDurationMs}ms`,
                user_id: req.user?.id || 1
            });

            return sendResponse(res, 200, "Scan sinkron berhasil diproses", createdScan);
        } catch (error: any) {
            return sendResponse(res, 500, `Baseline Sync Scan Gagal: ${error.message}`);
        }
    }

    /**
     * Baseline 01b-mid: In-Process Asynchronous Queue (RabbitMQ Alternative)
     * Responds with 202 Accepted immediately using an in-memory Node.js queue.
     * Proves memory buildup and lack of durability/resilience during process crashes.
     */
    static async inProcessQueueScan(req: AuthRequest, res: Response): Promise<Response> {
        try {
            if (!req.file) {
                return sendResponse(res, 400, "Tidak ada file gambar yang diunggah");
            }

            const jobId = `mem_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            inProcessJobQueue.push({
                id: jobId,
                fileBuffer: req.file.buffer,
                fileName: req.file.originalname || "tile.png",
                receivedAt: Date.now()
            });

            // Trigger non-blocking in-process worker
            setImmediate(() => {
                processInProcessQueue().catch(() => {});
            });

            return sendResponse(res, 202, "In-process memory queue accepted", {
                job_id: jobId,
                queue_length: inProcessJobQueue.length,
                status: "queued_in_memory"
            });
        } catch (error: any) {
            return sendResponse(res, 500, `Baseline In-Process Queue Error: ${error.message}`);
        }
    }

    /**
     * Baseline 02: Direct Heavy Database Query (Redis Cache Bypass)
     * Bypasses Redis in-memory cache and recomputes all KPI statistics directly from DB.
     * Proves database connection pool exhaustion and CPU spikes under high read volume.
     */
    static async getDashboardNoCache(req: Request, res: Response): Promise<Response> {
        try {
            const startOfCurrentMonth = dayjs(getNowIndonesiaTime()).startOf("month").toDate();
            const startOfLastMonth = dayjs(getNowIndonesiaTime()).subtract(1, "month").startOf("month").toDate();
            const endOfLastMonth = dayjs(getNowIndonesiaTime()).subtract(1, "month").endOf("month").toDate();

            // Direct recalculation hitting database directly without checking Redis
            const [totalPlatformUsers, platformScanStats] = await Promise.all([
                userRepository.count(),
                scanRepository.getScanKpiStatistics(
                    undefined,
                    startOfCurrentMonth,
                    startOfLastMonth,
                    endOfLastMonth
                )
            ]);

            const totalScansThisMonth = platformScanStats.totalScansThisMonth;
            const totalScansLastMonth = platformScanStats.totalScansLastMonth;
            const defectCountThisMonth = platformScanStats.defectCountThisMonth;
            const scanChangeText = calculateTrendPercentageText(totalScansLastMonth, totalScansThisMonth);

            const defectRate = totalScansThisMonth > 0
                ? Number(((defectCountThisMonth / totalScansThisMonth) * 100).toFixed(1))
                : 0;

            const payload = {
                total_scans: platformScanStats.totalScans,
                total_users: totalPlatformUsers,
                average_scan_accuracy: Number(platformScanStats.averageScanAccuracy) || 0,
                unnormal_scan_count: platformScanStats.unNormalScanCount,
                total_scans_this_month: totalScansThisMonth,
                scan_change_text: scanChangeText,
                defect_rate: defectRate,
                defect_count_this_month: defectCountThisMonth,
                active_users_this_month: platformScanStats.activeUsersThisMonth,
                source: "database_direct_no_cache"
            };

            return sendResponse(res, 200, "Dashboard KPI dihitung langsung dari DB", payload);
        } catch (error: any) {
            return sendResponse(res, 500, `Baseline No-Cache Error: ${error.message}`);
        }
    }

    /**
     * Baseline 02b-mid: In-Process Local Memory Cache (Node Cache / LRU Alternative)
     * Compares in-memory single-process cache against external distributed Redis cache.
     * Highlights: zero network hop on single node, but lack of cross-node consistency on multi-instance.
     */
    static async getDashboardInProcessCache(req: Request, res: Response): Promise<Response> {
        try {
            const cachedPayload = getFromLocalCache("dashboard_kpi_in_process");
            if (cachedPayload) {
                return sendResponse(res, 200, "Dashboard KPI dari In-Process Memory Cache", {
                    ...cachedPayload,
                    source: "in_process_memory_cache"
                });
            }

            const startOfCurrentMonth = dayjs(getNowIndonesiaTime()).startOf("month").toDate();
            const startOfLastMonth = dayjs(getNowIndonesiaTime()).subtract(1, "month").startOf("month").toDate();
            const endOfLastMonth = dayjs(getNowIndonesiaTime()).subtract(1, "month").endOf("month").toDate();

            const [totalPlatformUsers, platformScanStats] = await Promise.all([
                userRepository.count(),
                scanRepository.getScanKpiStatistics(
                    undefined,
                    startOfCurrentMonth,
                    startOfLastMonth,
                    endOfLastMonth
                )
            ]);

            const totalScansThisMonth = platformScanStats.totalScansThisMonth;
            const totalScansLastMonth = platformScanStats.totalScansLastMonth;
            const defectCountThisMonth = platformScanStats.defectCountThisMonth;
            const scanChangeText = calculateTrendPercentageText(totalScansLastMonth, totalScansThisMonth);

            const defectRate = totalScansThisMonth > 0
                ? Number(((defectCountThisMonth / totalScansThisMonth) * 100).toFixed(1))
                : 0;

            const payload = {
                total_scans: platformScanStats.totalScans,
                total_users: totalPlatformUsers,
                average_scan_accuracy: Number(platformScanStats.averageScanAccuracy) || 0,
                unnormal_scan_count: platformScanStats.unNormalScanCount,
                total_scans_this_month: totalScansThisMonth,
                scan_change_text: scanChangeText,
                defect_rate: defectRate,
                defect_count_this_month: defectCountThisMonth,
                active_users_this_month: platformScanStats.activeUsersThisMonth
            };

            setToLocalCache("dashboard_kpi_in_process", payload, 60);

            return sendResponse(res, 200, "Dashboard KPI dari DB dan disimpan ke In-Process Cache", {
                ...payload,
                source: "in_process_memory_cache_miss"
            });
        } catch (error: any) {
            return sendResponse(res, 500, `Baseline In-Process Cache Error: ${error.message}`);
        }
    }

    /**
     * Baseline 03: Polling Status (SSE Alternative)
     * Lightweight status query endpoint used for measuring short-polling overhead.
     */
    static async pollScanStatus(req: Request, res: Response): Promise<Response> {
        try {
            const scanId = req.params.scanId || req.query.scanId;
            if (!scanId) {
                return sendResponse(res, 400, "Parameter scanId wajib disertakan");
            }

            const queryOptions: any = {
                attributes: ["id", "scan_id", "prediction", "confidence", "inference_time", "updatedAt"]
            };

            if (String(scanId) === "latest") {
                queryOptions.order = [["createdAt", "DESC"]];
            } else {
                queryOptions.where = { scan_id: String(scanId) };
            }

            const scanRecord = await Scan.findOne(queryOptions);

            if (!scanRecord) {
                return sendResponse(res, 404, "Data scan tidak ditemukan");
            }

            return sendResponse(res, 200, "Status scan berhasil diambil", scanRecord);
        } catch (error: any) {
            return sendResponse(res, 500, `Baseline Poll Error: ${error.message}`);
        }
    }

    /**
     * Benchmark 04 Counterpart: Pure gRPC HTTP/2 Direct Inference
     * Calls Python ML via gRPC binary Protobuf directly without R2/RabbitMQ/DB
     * for pure apples-to-apples comparison against restInferenceScan.
     */
    static async grpcInferenceScan(req: AuthRequest, res: Response): Promise<Response> {
        try {
            if (!req.file) {
                return sendResponse(res, 400, "Tidak ada file gambar yang diunggah");
            }

            const startTime = Date.now();
            const predictionResult = await PythonMlGrpcClient.predictImage(
                req.file.buffer,
                req.file.originalname || "tile.png"
            );
            const inferenceDurationMs = Date.now() - startTime;

            return sendResponse(res, 200, "Inference via gRPC HTTP/2 Berhasil", {
                ...predictionResult,
                client_inference_time_ms: inferenceDurationMs,
                protocol: "HTTP/2 gRPC Protobuf"
            });
        } catch (error: any) {
            return sendResponse(res, 502, `gRPC Direct Inference Error: ${error.message}`);
        }
    }

    /**
     * Baseline 04: REST HTTP/1.1 Inference (gRPC Protobuf Alternative)
     * Forwards image to Python FastAPI via HTTP/1.1 multipart rather than gRPC binary HTTP/2.
     * Proves textual MIME parsing overhead and Head-of-Line connection blocking.
     */
    static async restInferenceScan(req: AuthRequest, res: Response): Promise<Response> {
        try {
            if (!req.file) {
                return sendResponse(res, 400, "Tidak ada file gambar yang diunggah");
            }

            const pythonRestUrl = process.env.PYTHON_ML_REST_URL || "http://localhost:8000/predict";

            const formData = new FormData();
            const blob = new Blob([new Uint8Array(req.file.buffer)], { type: req.file.mimetype });
            formData.append("file", blob, req.file.originalname || "tile.png");

            const startTime = Date.now();
            const response = await axios.post(pythonRestUrl, formData, {
                httpAgent: restKeepAliveAgent,
                timeout: 10000
            });
            const inferenceDurationMs = Date.now() - startTime;

            return sendResponse(res, 200, "Inference via REST HTTP/1.1 Berhasil", {
                ...response.data,
                client_inference_time_ms: inferenceDurationMs,
                protocol: "HTTP/1.1 REST Multipart"
            });
        } catch (error: any) {
            const statusCode = error.response?.status || 502;
            const message = error.response?.data?.detail || error.message;
            return sendResponse(res, statusCode, `Baseline REST Inference Error: ${message}`);
        }
    }

    /**
     * Baseline 05: Local Disk File Storage (Cloudflare R2 Alternative)
     * Saves binary file directly to container/server local hard disk.
     * Proves disk I/O saturation, full disk risk, and failure to horizontally scale.
     */
    static async localDiskScan(req: AuthRequest, res: Response): Promise<Response> {
        try {
            if (!req.file) {
                return sendResponse(res, 400, "Tidak ada file gambar yang diunggah");
            }

            const baselineUploadDir = path.join(process.cwd(), "uploads", "baseline");
            await fs.promises.mkdir(baselineUploadDir, { recursive: true });

            const timestamp = Date.now();
            const safeFilename = path.basename(req.file.originalname || "tile.png");
            const targetFilename = `local_${timestamp}_${safeFilename}`;
            const targetPath = path.join(baselineUploadDir, targetFilename);

            // Synchronous disk write I/O blocking
            await fs.promises.writeFile(targetPath, req.file.buffer);

            return sendResponse(res, 201, "File berhasil disimpan di disk lokal VPS", {
                file_name: targetFilename,
                storage_type: "local_disk",
                file_size_bytes: req.file.size,
                local_path: targetPath
            });
        } catch (error: any) {
            return sendResponse(res, 500, `Baseline Local Disk Error: ${error.message}`);
        }
    }

    /**
     * Baseline 06: Monolithic Database Queries (CQRS & Polyglot Alternative)
     * Aggregates directly on active MySQL transactional table without separating Command/Query models.
     * Proves table locking and write starvation under heavy read traffic.
     */
    static async getDashboardMonolith(req: Request, res: Response): Promise<Response> {
        try {
            const startOfCurrentMonth = dayjs(getNowIndonesiaTime()).startOf("month").toDate();
            const startOfLastMonth = dayjs(getNowIndonesiaTime()).subtract(1, "month").startOf("month").toDate();
            const endOfLastMonth = dayjs(getNowIndonesiaTime()).subtract(1, "month").endOf("month").toDate();

            // Full relational aggregation directly on active MySQL scan_histories table (no CQRS read-model)
            const [totalPlatformUsers, overallAgg, currentMonthCount, lastMonthCount] = await Promise.all([
                userRepository.count(),
                Scan.findOne({
                    attributes: [
                        [fn("COUNT", col("id")), "totalScans"],
                        [fn("AVG", col("confidence")), "avgConfidence"],
                        [literal("SUM(CASE WHEN prediction IN ('crack', 'scratch', 'stain') THEN 1 ELSE 0 END)"), "defectScans"]
                    ],
                    raw: true
                }) as any,
                Scan.count({
                    where: { createdAt: { [Op.gte]: startOfCurrentMonth } }
                }),
                Scan.count({
                    where: { createdAt: { [Op.between]: [startOfLastMonth, endOfLastMonth] } }
                })
            ]);

            const totalScans = Number(overallAgg?.totalScans) || 0;
            const defectScans = Number(overallAgg?.defectScans) || 0;
            const avgConfidence = Number(overallAgg?.avgConfidence) || 0;

            return sendResponse(res, 200, "Monolithic MySQL full KPI aggregation completed", {
                total_scans: totalScans,
                total_users: totalPlatformUsers,
                average_scan_accuracy: Number(avgConfidence.toFixed(2)),
                defect_scans: defectScans,
                total_scans_this_month: currentMonthCount,
                scan_change_text: calculateTrendPercentageText(lastMonthCount, currentMonthCount),
                defect_ratio: totalScans > 0 ? Number(((defectScans / totalScans) * 100).toFixed(1)) : 0,
                architecture_mode: "monolithic_mysql_full_aggregation"
            });
        } catch (error: any) {
            return sendResponse(res, 500, `Baseline Monolith Error: ${error.message}`);
        }
    }

    /**
     * Baseline 06b-mid: Optimized MySQL Summary / Indexed Query (CQRS Alternative)
     * Compares full CQRS against an optimized MySQL summary query.
     * Demonstrates that while summary queries reduce scan cost, they still compete
     * for MySQL connection pool & lock resources with concurrent write transactions.
     */
    static async getDashboardIndexedSummary(req: Request, res: Response): Promise<Response> {
        try {
            const [results] = await sequelize.query(`
                SELECT 
                    (SELECT COUNT(1) FROM users) as total_users,
                    (SELECT COUNT(1) FROM scan_histories) as total_scans,
                    (SELECT AVG(confidence) FROM scan_histories) as avg_confidence
            `);
            const summary = (results as any[])?.[0] || {};

            return sendResponse(res, 200, "Dashboard KPI dari MySQL Indexed Summary", {
                total_users: Number(summary.total_users) || 0,
                total_scans: Number(summary.total_scans) || 0,
                average_scan_accuracy: Number(summary.avg_confidence) || 0,
                source: "mysql_indexed_summary"
            });
        } catch (error: any) {
            return sendResponse(res, 500, `MySQL Indexed Summary Error: ${error.message}`);
        }
    }

    /**
     * Baseline 07: Fail-and-Forget Error Handling (Dead Letter Queue Alternative)
     * Simulates unhandled processing crash with direct 500 throw.
     * Proves zero fault tolerance and catastrophic data loss during worker failures.
     */
    static async failAndForgetScan(req: Request, res: Response): Promise<Response> {
        // Unhandled crash simulation without DLQ capture
        return sendResponse(res, 500, "Simulasi Fatal Worker Error: Request gagal diproses dan event hilang selamanya");
    }

    /**
     * Baseline 07b-mid: In-Process Synchronous Retry 3x with Exponential Backoff
     * Simulates realistic handling of transient downstream failures (fails 2x, succeeds on 3rd attempt).
     * Demonstrates:
     * 1. While synchronous retry recovers to HTTP 200 (0% error), it severely penalizes client latency (socket held ~50-80ms).
     * 2. If the Node process crashes or restarts during retry, the in-flight job in memory is permanently lost.
     */
    static async inProcessRetryScan(req: Request, res: Response): Promise<Response> {
        const jobId = `retry_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const maxRetries = 3;
        let attempts = 0;
        const startTime = Date.now();
        const isPermanent = req.query.permanent === "true";

        while (attempts < maxRetries) {
            attempts++;
            // Simulate transient downstream blip for attempts < 3
            if (attempts < 3 || isPermanent) {
                // Exponential backoff: 15ms, 30ms
                await new Promise((resolve) => setTimeout(resolve, attempts * 15));
                if (isPermanent && attempts === maxRetries) {
                    return sendResponse(res, 500, "Permanent failure: job exhausted 3 retries (logged in-process memory only)", {
                        jobId,
                        attempts,
                        status: "exhausted_retries",
                        durability: "process_memory_only",
                        elapsed_ms: Date.now() - startTime
                    });
                }
                continue;
            }

            // Attempt 3 succeeds: recovered from transient failure
            return sendResponse(res, 200, "Scan berhasil dipulihkan setelah 3x synchronous retry", {
                jobId,
                attempts,
                status: "recovered_on_retry_3",
                durability: "process_memory_only",
                elapsed_ms: Date.now() - startTime
            });
        }

        return sendResponse(res, 500, "Gagal setelah 3x in-process retry", {
            jobId,
            attempts,
            elapsed_ms: Date.now() - startTime
        });
    }

    /**
     * Baseline 08: Single Scan for Client Looping Benchmark (Batch Alternative)
     * Used by client loop benchmarks to send 20 consecutive HTTP calls.
     */
    static async singleLoopScan(req: AuthRequest, res: Response): Promise<Response> {
        try {
            if (!req.file) {
                return sendResponse(res, 400, "Tidak ada file gambar yang diunggah");
            }
            return sendResponse(res, 200, "Single loop scan received", {
                received_filename: req.file.originalname,
                byte_size: req.file.size
            });
        } catch (error: any) {
            return sendResponse(res, 500, `Baseline Single Loop Error: ${error.message}`);
        }
    }

    /**
     * Baseline 09: MySQL Row-Locked Quota Decrement (Redis Atomic Write-Behind Alternative)
     * Uses SELECT ... FOR UPDATE on a single user_id row to prevent overselling under concurrency.
     */
    static async mysqlLockedQuotaDecrement(req: Request, res: Response): Promise<Response> {
        const userId = Number(req.body?.userId) || 1;
        const amount = Number(req.body?.amount) || 1;

        try {
            const result = await sequelize.transaction(async (transaction: Transaction) => {
                const userQuota = await UserQuotaModel.findOne({
                    where: { user_id: userId },
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });

                if (!userQuota) {
                    return { allowed: false, status: 404, message: `User quota tidak ditemukan untuk user ${userId}` };
                }

                const remaining = userQuota.total_quota - userQuota.used_quota;
                if (remaining < amount) {
                    return { allowed: false, status: 429, message: "Kuota habis (MySQL locked)" };
                }

                userQuota.used_quota += amount;
                await userQuota.save({ transaction });

                return { allowed: true, status: 200, remaining: remaining - amount };
            });

            if (!result.allowed) {
                return sendResponse(res, result.status, result.message || "Kuota habis");
            }

            return sendResponse(res, 200, "MySQL locked quota decremented", {
                userId,
                remaining: result.remaining
            });
        } catch (error: any) {
            return sendResponse(res, 500, `MySQL Locked Quota Error: ${error.message}`);
        }
    }

    /**
     * Baseline 09b: MySQL Atomic Single-Statement SQL Quota Decrement
     * Single query without multi-step transaction or FOR UPDATE lock:
     * UPDATE user_quotas SET used_quota = used_quota + :amount WHERE user_id = :userId AND (total_quota - used_quota) >= :amount
     */
    static async mysqlAtomicSqlQuotaDecrement(req: Request, res: Response): Promise<Response> {
        const userId = Number(req.body?.userId) || 1;
        const amount = Number(req.body?.amount) || 1;

        try {
            const [, metadata] = await sequelize.query(
                `UPDATE user_quotas 
                 SET used_quota = used_quota + :amount 
                 WHERE user_id = :userId AND (total_quota - used_quota) >= :amount`,
                {
                    replacements: { userId, amount }
                }
            );

            const affectedRows = (metadata as any)?.affectedRows ?? 0;
            if (affectedRows === 0) {
                return sendResponse(res, 429, "Kuota habis (Atomic SQL)");
            }

            return sendResponse(res, 200, "Atomic SQL quota decremented", { userId });
        } catch (error: any) {
            return sendResponse(res, 500, `MySQL Atomic SQL Quota Error: ${error.message}`);
        }
    }

    /**
     * Baseline 09c: Redis Atomic Quota + Synchronous Write-Through to MySQL
     * Isolates the true benefit of asynchronous write-behind vs synchronous DB write.
     */
    static async redisWriteThroughQuotaDecrement(req: Request, res: Response): Promise<Response> {
        const userId = Number(req.body?.userId) || 1;
        const amount = Number(req.body?.amount) || 1;

        try {
            const redis = getRedisClient();
            const quotaKey = `user:${userId}:remaining_quota`;

            let currentQuota = await redis.get(quotaKey);
            if (currentQuota === null) {
                const userQuotaRecord = await UserQuotaModel.findOne({ where: { user_id: userId } });
                if (!userQuotaRecord) {
                    return sendResponse(res, 404, `User quota tidak ditemukan untuk user ${userId}`);
                }
                const remaining = userQuotaRecord.total_quota - userQuotaRecord.used_quota;
                currentQuota = remaining.toString();
                await redis.set(quotaKey, currentQuota, "EX", 86400);
            }

            if (parseInt(currentQuota) < amount) {
                return sendResponse(res, 429, "Kuota habis (Redis Write-Through)");
            }

            const newRemaining = await redis.decrBy(quotaKey, amount);
            if (newRemaining < 0) {
                await redis.incrBy(quotaKey, amount);
                return sendResponse(res, 429, "Kuota habis (Redis Write-Through)");
            }

            // Synchronous Write-Through directly to MySQL
            await sequelize.query(
                `UPDATE user_quotas 
                 SET used_quota = used_quota + :amount 
                 WHERE user_id = :userId`,
                {
                    replacements: { userId, amount }
                }
            );

            return sendResponse(res, 200, "Redis Write-Through quota decremented", { userId, remaining: newRemaining });
        } catch (error: any) {
            return sendResponse(res, 500, `Redis Write-Through Quota Error: ${error.message}`);
        }
    }

    /**
     * Production Benchmark 09: Redis Atomic Quota Decrement + Write-Behind
     * Uses redis.decrBy + compensating incrBy without locking MySQL rows.
     */
    static async redisAtomicQuotaDecrement(req: Request, res: Response): Promise<Response> {
        const userId = Number(req.body?.userId) || 1;
        const amount = Number(req.body?.amount) || 1;

        try {
            const allowed = await quotaService.checkAndDecrementQuota(userId, amount);
            if (!allowed) {
                return sendResponse(res, 429, "Kuota habis (Redis atomic)");
            }

            return sendResponse(res, 200, "Redis atomic quota decremented", { userId });
        } catch (error: any) {
            return sendResponse(res, 500, `Redis Atomic Quota Error: ${error.message}`);
        }
    }

    /**
     * Benchmark 09 Helper: Reset both MySQL and Redis quota for deterministic burst testing.
     */
    static async resetBenchmarkQuota(req: Request, res: Response): Promise<Response> {
        const userId = Number(req.body?.userId) || 1;
        const totalQuota = Number(req.body?.totalQuota) || 10000;

        try {
            await quotaService.initializeUserQuota({ userId, totalQuota });
            return sendResponse(res, 200, "Benchmark quota reset", { userId, totalQuota });
        } catch (error: any) {
            return sendResponse(res, 500, `Reset Benchmark Quota Error: ${error.message}`);
        }
    }
}
