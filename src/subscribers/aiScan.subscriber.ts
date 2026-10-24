import { NotificationService } from "../services/notification.service";
import { BaseRabbitSubscriber } from "./base.subscriber";
import { PythonMlGrpcClient } from "../services/pythonMlClient.service";
import { scanService } from "../services/scan.service";
import { quotaService } from "../services/quota.service";
import { getRedisClient } from "../config/redisClient";
import { downloadFileFromR2 } from "../utils/r2.util";
import { log } from "../utils/logger";
import { RecordCompletedScanUseCase } from "../modules/leaderboard/use-cases/RecordCompletedScanUseCase";

export class AiScanSubscriber extends BaseRabbitSubscriber {
    protected readonly exchangeName = "cerascan_events";
    protected readonly queueName = "ai_scan_worker_queue";
    protected readonly routingKeys = ["scan.process"];
    protected prefetchCount = 1;

    constructor() {
        super();
    }

    protected getMessageId(eventData: any, routingKey: string): string {
        return `${eventData?.db_id || "unknown"}`;
    }

    protected async processMessage(eventData: any, routingKey: string): Promise<void> {
        const startTime = Date.now();

        const imageBuffer = await downloadFileFromR2(eventData.r2_object_key);
        const predictionResult = await PythonMlGrpcClient.predictImage(imageBuffer, eventData.original_name);
        const inferenceDurationMs = Date.now() - startTime;
        const inferenceTimeString = `${inferenceDurationMs}ms`;

        // 1. Update SQL Database status to success
        if (eventData.db_id) {
            await scanService.markScanAsSuccess(
                eventData.db_id,
                predictionResult.prediction,
                predictionResult.confidence_score,
                inferenceTimeString
            );
        }

        // 2. Update Leaderboard if user is registered
        if (eventData.user_id && predictionResult.prediction) {
            try {
                const recordCompletedScanUseCase = new RecordCompletedScanUseCase();
                await recordCompletedScanUseCase.execute(eventData.user_id, predictionResult.prediction);
            } catch (leaderboardError) {
                console.error("[AI Worker] Gagal memperbarui leaderboard:", leaderboardError);
            }
        }

        // 3. Record MongoDB analytics & invalidate Redis dashboard cache
        try {
            await scanService.recordScanAnalytics({
                scan_id: eventData.scan_id,
                user_id: eventData.user_id || 0,
                prediction: predictionResult.prediction,
                confidence_score: predictionResult.confidence_score,
                inference_time: inferenceDurationMs
            });

            const redisClient = getRedisClient();
            if (eventData.user_id) {
                await redisClient.del(`dashboard:kpi:${eventData.user_id}`);
                await redisClient.del(`dashboard:trend:${eventData.user_id}`);
            } else {
                await redisClient.del("dashboard:kpi");
                await redisClient.del("dashboard:trend");
            }
        } catch (analyticsError) {
            console.error("[AI Worker] Gagal mencatat analitik scan:", analyticsError);
        }

        // 4. Emit real-time notification to client via Socket.io
        try {
            await NotificationService.emitScanCompleted({
                db_id: eventData.db_id,
                scan_id: eventData.scan_id,
                prediction: predictionResult.prediction,
                confidence: predictionResult.confidence_score,
                inference_time: inferenceTimeString
            });
        } catch (socketError) {
            console.error("[AI Worker] Gagal memancarkan event socket scan_completed:", socketError);
        }

        log.success("AI Worker", `Selesai Scan ${eventData.scan_id}. Hasil: ${predictionResult.prediction} (${predictionResult.confidence_score}%)`);
    }

    protected async onMaxRetriesExhausted(eventData: any, routingKey: string, error: unknown): Promise<void> {
        if (!eventData) return;

        try {
            if (eventData.db_id) {
                await scanService.markScanAsFailed(eventData.db_id);
                log.info("AI Worker", `Status DB diubah ke 'failed' untuk ID: ${eventData.db_id}`);
            }
        } catch (dbError) {
            console.error("[AI Worker] Gagal mengupdate status database ke failed:", dbError);
        }

        try {
            if (eventData.scan_id) {
                await NotificationService.emitScanFailed({
                    scan_id: eventData.scan_id,
                    db_id: eventData.db_id,
                    error: error instanceof Error ? error.message : "Unknown error"
                });
            }
        } catch (socketError) {
            console.error("[AI Worker] Gagal memancarkan event socket scan_failed:", socketError);
        }

        try {
            if (eventData.user_id) {
                await quotaService.refundUserQuota(eventData.user_id);
                log.info("AI Worker", `Kuota user ${eventData.user_id} berhasil dikembalikan (+1) karena gagal scan.`);
            }
        } catch (refundError) {
            console.error("[AI Worker] Gagal mengembalikan kuota user:", refundError);
        }
    }
}
