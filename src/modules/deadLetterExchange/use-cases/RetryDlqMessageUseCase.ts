import { Op, WhereOptions } from "sequelize";
import { DeadLetterMessage, Scan } from "../../../models";
import { DeadLetterMessageAttributes } from "../../../models/deadLetterMessage.model";
import { RabbitmqPublisher } from "../../../transport/rabbitmq/infrastructure/rabbitmq.publisher";
import { quotaService } from "../../../services/quota.service";
import { NotificationService } from "../../../services/notification.service";
import { log } from "../../../utils/logger";

export class RetryDlqMessageUseCase {
    async execute(targetId: string, requestUserId: number, isAdmin: boolean): Promise<boolean> {
        const numericId = Number(targetId);
        const whereClause: WhereOptions<DeadLetterMessageAttributes> = {
            status: "dead",
            [Op.or]: [
                { message_id: targetId },
                ...(!isNaN(numericId) ? [{ id: numericId }] : [])
            ]
        };

        const deadLetterRecord = await DeadLetterMessage.findOne({
            where: whereClause,
            order: [["createdAt", "DESC"]],
        });

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

        await RabbitmqPublisher.publishEvent(targetRoutingKey, parsedPayload);

        deadLetterRecord.status = "retried";
        await deadLetterRecord.save();

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
}
