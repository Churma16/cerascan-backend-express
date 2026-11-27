import { dlqRepository, DlqRepository } from "../repositories/dlq.repository";
import { scanRepository, ScanRepository } from "../repositories/scan.repository";
import { RabbitmqPublisher } from "../transport/rabbitmq/infrastructure/rabbitmq.publisher";
import { quotaService } from "./quota.service";
import { NotificationService } from "./notification.service";
import { getRabbitChannel } from "../config/rabbitmqClient";
import { log } from "../utils/logger.util";

export class DlqService {
    private static readonly DLQ_QUEUE_NAME = "payment_dead_letter_queue";
    private dlqRepo: DlqRepository;
    private scanRepo: ScanRepository;

    constructor(
        dlqRepo: DlqRepository = dlqRepository,
        scanRepo: ScanRepository = scanRepository
    ) {
        this.dlqRepo = dlqRepo;
        this.scanRepo = scanRepo;
    }

    async getDlqMessages(requestUserId: number, isAdmin: boolean, limit: number = 100): Promise<any[]> {
        const deadLetterRecords = await this.dlqRepo.findDeadMessages({
            userId: !isAdmin ? requestUserId : undefined,
            limit,
            order: "DESC",
        });

        return deadLetterRecords.map((record) => {
            const raw = record.toJSON();
            return {
                id: raw.id,
                messageId: raw.message_id,
                userId: raw.user_id,
                routingKey: raw.routing_key,
                payload: raw.payload,
                errorMessage: raw.error_message,
                retryCount: raw.retry_count,
                status: raw.status,
                createdAt: raw.createdAt,
            };
        });
    }

    async retryDlqMessage(targetId: string, requestUserId: number, isAdmin: boolean): Promise<boolean> {
        const deadLetterRecord = await this.dlqRepo.findDeadMessageByIdOrMessageId(targetId);

        if (!deadLetterRecord) {
            return false;
        }

        if (!isAdmin && deadLetterRecord.user_id && deadLetterRecord.user_id !== requestUserId) {
            throw new Error("403 Forbidden: Anda tidak memiliki akses untuk me-retry pesan ini.");
        }

        const parsedPayload = deadLetterRecord.payload || {};
        const targetRoutingKey = deadLetterRecord.routing_key || "scan.process";

        if (targetRoutingKey === "scan.process" && deadLetterRecord.user_id) {
            const hasQuota = await quotaService.checkAndDecrementQuota(deadLetterRecord.user_id);

            if (!hasQuota) {
                throw new Error(`User ID ${deadLetterRecord.user_id} tidak memiliki kuota yang cukup untuk melakukan retry scan.`);
            }
        }

        if (parsedPayload.db_id) {
            try {
                await this.scanRepo.update(parsedPayload.db_id, { prediction: "processing" });
                log.info(
                    "DLQ Service",
                    `Status DB diubah kembali ke 'processing' untuk ID: ${parsedPayload.db_id}`
                );
            } catch (dbError) {
                log.error("DLQ Service", "Gagal update status DB ke 'processing':", dbError);
            }
        }

        await RabbitmqPublisher.publishEvent(targetRoutingKey, parsedPayload);

        deadLetterRecord.status = "retried";
        await this.dlqRepo.save(deadLetterRecord);

        await NotificationService.emitDlqUpdated({
            action: "remove",
            data: {
                messageId: deadLetterRecord.message_id,
                routingKey: deadLetterRecord.routing_key,
            }
        });

        log.success("DLQ Service", `Pesan '${deadLetterRecord.message_id}' berhasil di-retry.`);
        return true;
    }

    async retryAllDlqMessages(requestUserId: number, isAdmin: boolean): Promise<{ successCount: number; skippedCount: number }> {
        const deadLetterRecords = await this.dlqRepo.findDeadMessages({
            userId: !isAdmin ? requestUserId : undefined,
            order: "ASC",
        });

        let successCount = 0;
        let skippedCount = 0;

        for (const record of deadLetterRecords) {
            const parsedPayload = record.payload || {};
            const targetRoutingKey = record.routing_key || "scan.process";

            if (targetRoutingKey === "scan.process" && record.user_id) {
                const hasQuota = await quotaService.checkAndDecrementQuota(record.user_id);

                if (!hasQuota) {
                    skippedCount++;
                    continue;
                }
            }

            if (parsedPayload.db_id) {
                try {
                    await this.scanRepo.update(parsedPayload.db_id, { prediction: "processing" });
                    log.info(
                        "DLQ Service",
                        `Status DB diubah kembali ke 'processing' untuk ID: ${parsedPayload.db_id}`
                    );
                } catch (dbError) {
                    log.error("DLQ Service", "Gagal update status DB ke 'processing':", dbError);
                }
            }

            const isPublished = await RabbitmqPublisher.publishEvent(targetRoutingKey, parsedPayload);
            if (isPublished) {
                record.status = "retried";
                await this.dlqRepo.save(record);
                successCount++;
            } else {
                skippedCount++;
            }
        }

        if (successCount > 0) {
            await NotificationService.emitDlqUpdated({
                action: "bulk_retry",
                data: { successCount, skippedCount }
            });
        }

        return { successCount, skippedCount };
    }

    async purgeDlq(): Promise<void> {
        try {
            await this.dlqRepo.purgeAllDead();
            log.info("DLQ Service", "Seluruh record DLQ berstatus dead berhasil diubah menjadi purged.");
        } catch (dbError) {
            log.error("DLQ Service", "Gagal memperbarui status record DLQ di database:", dbError);
        }

        try {
            const channel = getRabbitChannel();
            if (channel) {
                await channel.purgeQueue(DlqService.DLQ_QUEUE_NAME);
            }
        } catch (rabbitError) {
            log.error("DLQ Service", "Gagal membersihkan antrean fisik RabbitMQ:", rabbitError);
        }

        await NotificationService.emitDlqUpdated({
            action: "purge",
            data: {}
        });
    }
}

export const dlqService = new DlqService();
