import { getRabbitChannel } from "../../../config/rabbitmqClient";
import { DeadLetterMessage } from "../../../models";
import { NotificationService } from "../../../services/notification.service";
import { log } from "../../../utils/logger.util";

export class PurgeDlqQueueUseCase {
    private static readonly DLQ_QUEUE_NAME = 'payment_dead_letter_queue';

    async execute(): Promise<void> {
        try {
            await DeadLetterMessage.update(
                { status: 'purged' },
                { where: { status: 'dead' } }
            );
            log.info('DLQ Service', 'Seluruh record DLQ berstatus dead berhasil diubah menjadi purged.');
        } catch (dbError) {
            log.error('DLQ Service', 'Gagal memperbarui status record DLQ di database:', dbError);
        }

        try {
            const channel = getRabbitChannel();
            if (channel) {
                await channel.purgeQueue(PurgeDlqQueueUseCase.DLQ_QUEUE_NAME);
            }
        } catch (rabbitError) {
            log.error('DLQ Service', 'Gagal membersihkan antrean fisik RabbitMQ:', rabbitError);
        }

        await NotificationService.emitDlqUpdated({
            action: 'purge',
            data: {}
        });
    }
}
