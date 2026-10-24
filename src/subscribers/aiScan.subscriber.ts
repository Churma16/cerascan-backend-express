import { NotificationService } from "../services/notification.service";
import { BaseRabbitSubscriber } from "./base.subscriber";
import { PythonMlGrpcClient } from "../services/pythonMlGrpc.service";
import { scanService } from "../services/scan.service";
import { quotaService } from "../services/quota.service";
import { storageService } from "../services/storage.service";
import { StreamPublisher } from "../transport/stream/stream.publisher";
import { log } from "../utils/logger.util";

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

        const imageBuffer = await storageService.downloadFile(eventData.r2_object_key);
        const predictionResult = await PythonMlGrpcClient.predictImage(imageBuffer, eventData.original_name);
        const inferenceDurationMs = Date.now() - startTime;

        await StreamPublisher.publishScanCompleted({
            scan_id: eventData.scan_id,
            user_id: eventData.user_id,
            db_id: eventData.db_id,
            prediction: predictionResult.prediction,
            confidence_score: predictionResult.confidence_score,
            inference_time: inferenceDurationMs
        });

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
