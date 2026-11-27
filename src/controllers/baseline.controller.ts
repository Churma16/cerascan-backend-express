import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import axios from "axios";
import dayjs from "dayjs";
import { fn, col, Op, literal } from "sequelize";
import { sendResponse } from "../utils/response.util";
import { AuthRequest } from "../middleware/auth.middleware";
import { PythonMlGrpcClient } from "../services/pythonMlGrpc.service";
import Scan from "../models/scan.model";
import { userRepository } from "../repositories/user.repository";
import { scanRepository } from "../repositories/scan.repository";
import { getNowIndonesiaTime } from "../utils/time.util";
import { calculateTrendPercentageText } from "../queries/dashboard/dashboardKpi.types";

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
     * Baseline 07: Fail-and-Forget Error Handling (Dead Letter Queue Alternative)
     * Simulates unhandled processing crash with direct 500 throw.
     * Proves zero fault tolerance and catastrophic data loss during worker failures.
     */
    static async failAndForgetScan(req: Request, res: Response): Promise<Response> {
        // Unhandled crash simulation without DLQ capture
        return sendResponse(res, 500, "Simulasi Fatal Worker Error: Request gagal diproses dan event hilang selamanya");
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
}
