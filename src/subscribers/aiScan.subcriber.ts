import { BaseRabbitSubscriber } from "./base.subscriber";
import { PythonMlGrpcClient } from "../modules/scan/infrastructure/microservice/python_ml_grpc_client";
import { AnalyticsPublisherFactory } from "../modules/scan/infrastructure/AnalyticsPublisherFactory";
import { UpdateScanFailedUseCase } from "../modules/scan/use-cases/UpdateScanFailedUseCase";
import { EmitScanFailedUseCase } from "../modules/notification/use-cases/EmitScanFailedUseCase";
import { RefundUserQuotaUseCase } from "../modules/user_quota/use-cases/RefundUserQuotaUseCase";
import { log } from "../utils/logger";
import {downloadFileFromR2} from "../utils/r2.util";

export class AiScanSubscriber extends BaseRabbitSubscriber {
    protected readonly exchangeName = 'cerascan_events';
    protected readonly queueName = 'ai_scan_worker_queue';
    protected readonly routingKeys = ['scan.process'];
    protected prefetchCount = 1;

    constructor() {
        super();
        const analyticsPublisher = AnalyticsPublisherFactory.getPublisher();
        analyticsPublisher.connect().catch(err => {
            console.error('Gagal inisialisasi koneksi awal Kafka:', err.message);
        });
    }

    protected getMessageId(eventData: any, routingKey: string): string {
        return `${eventData?.db_id || 'unknown'}`;
    }

    protected async processMessage(eventData: any, routingKey: string): Promise<void> {
        const startTime = Date.now();

        const imageBuffer = await downloadFileFromR2(eventData.r2_object_key);

        const result = await PythonMlGrpcClient.predictImage(imageBuffer, eventData.original_name);

        const inferenceTimeMs = Date.now() - startTime;
        const eventPublisher = AnalyticsPublisherFactory.getPublisher();
        eventPublisher.publish({
            db_id: eventData.db_id,
            scan_id: eventData.scan_id,
            user_id: eventData.user_id,
            prediction: result.prediction,
            confidence_score: result.confidence_score,
            inference_time: `${inferenceTimeMs}ms`
        }).catch(err => {
            console.error('[WARNING][KAFKA] Gagal mengirim event scan_completed ke Kafka:', err.message);
        });
        log.success('AI Worker', `Selesai Scan ${eventData.scan_id}. Hasil: ${result.prediction}`);
    }

    protected async onMaxRetriesExhausted(eventData: any, routingKey: string, error: unknown): Promise<void> {
        if (!eventData) return;

        try {
            if (eventData.db_id) {
                const updateScanFailedUseCase = new UpdateScanFailedUseCase();
                await updateScanFailedUseCase.execute(eventData.db_id);
                log.info('AI Worker', `Status DB diubah ke 'failed' untuk ID: ${eventData.db_id}`);
            }
        } catch (dbErr) {
            console.error(`[AI Worker] Gagal mengupdate status database ke failed:`, dbErr);
        }

        try {
            if (eventData.scan_id) {
                const emitScanFailedUseCase = new EmitScanFailedUseCase();
                await emitScanFailedUseCase.execute({
                    scan_id: eventData.scan_id,
                    db_id: eventData.db_id,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        } catch (socketErr) {
            console.error(`[AI Worker] Gagal memancarkan event socket scan_failed:`, socketErr);
        }

        try {
            if (eventData.user_id) {
                const refundUserQuotaUseCase = new RefundUserQuotaUseCase();
                await refundUserQuotaUseCase.execute(eventData.user_id);
                log.info('AI Worker', `Kuota user ${eventData.user_id} berhasil dikembalikan (+1) karena gagal scan.`);
            }
        } catch (refundErr) {
            console.error(`[AI Worker] Gagal mengembalikan kuota user:`, refundErr);
        }
    }
}
