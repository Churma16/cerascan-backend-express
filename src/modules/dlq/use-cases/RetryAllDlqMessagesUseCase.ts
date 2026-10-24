import { WhereOptions } from "sequelize";
import { DeadLetterMessage, Scan } from "../../../models";
import { DeadLetterMessageAttributes } from "../../../models/deadLetterMessage.model";
import { RabbitmqPublisher } from "../../../transport/rabbitmq/infrastructure/rabbitmq.publisher";
import { quotaService } from "../../../services/quota.service";
import { NotificationService } from "../../../services/notification.service";
import { log } from "../../../utils/logger.util";

export class RetryAllDlqMessagesUseCase {
    async execute(requestUserId: number, isAdmin: boolean): Promise<{ successCount: number; skippedCount: number }> {
        const whereClause: WhereOptions<DeadLetterMessageAttributes> = {
            status: "dead",
        };

        if (!isAdmin) {
            whereClause.user_id = requestUserId;
        }

        const deadLetterRecords = await DeadLetterMessage.findAll({
            where: whereClause,
            order: [["createdAt", "ASC"]],
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
                    await Scan.update(
                        { prediction: "processing" },
                        { where: { id: parsedPayload.db_id } }
                    );
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
                await record.save();
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
}
