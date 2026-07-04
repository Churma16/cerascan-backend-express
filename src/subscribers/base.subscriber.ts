import {getRabbitChannel} from "../config/rabbitmq_client";
import {RabbitMQClient} from "../modules/rabbitmq/infrastructure/rabbitmq.client";
import {log} from "../utils/logger";
import { EmitDlqUpdatedUseCase } from "../modules/notification/use-cases/EmitDlqUpdatedUseCase";

export abstract class BaseRabbitSubscriber {
    protected abstract readonly exchangeName: string;
    protected abstract readonly queueName: string;
    protected abstract readonly routingKeys: string[];
    protected prefetchCount?: number;

    protected readonly maxRetries: number = 3;
    private retryMap = new Map<string, number>();

    // Method To precess message
    protected abstract processMessage(eventData: any, routingKey: string): Promise<void>;

    // Unique ID for Retry Purpose
    protected abstract getMessageId(eventData: any, routingKey: string): string;

    // Optional method for handing dlq
    protected async onMaxRetriesExhausted(eventData: any, routingKey: string, error: unknown): Promise<void> {
        // Implementasi default kosong. Kelas anak bisa meng-override jika butuh (contoh: update status DB ke 'failed')
    }

    async start(): Promise<void> {
        try {
            const channel = getRabbitChannel();

            if (this.prefetchCount) {
                channel.prefetch(this.prefetchCount);
            }

            if (process.env.NODE_ENV !== 'production') {
                try {
                    await channel.deleteQueue(this.queueName);
                    log.info('Worker', `Queue lama '${this.queueName}' dihapus`);
                } catch (err) {
                    // Abaikan jika queue tidak ada
                }
            }

            await channel.assertQueue(this.queueName, {
                durable: true,
                arguments: {
                    'x-dead-letter-exchange': RabbitMQClient.getDLXExchangeName()
                }
            });

            for (const key of this.routingKeys) {
                await channel.bindQueue(this.queueName, this.exchangeName, key);
            }

            log.info('Worker', `Mendengarkan event '${this.routingKeys.join(', ')}' di antrean '${this.queueName}'...`);

            await channel.consume(this.queueName, async (msg: any) => {
                if (!msg) return;

                const routingKey = msg.fields.routingKey;
                let eventData: any = null;
                let messageId = 'unknown';

                try {
                    eventData = JSON.parse(msg.content.toString());
                    messageId = this.getMessageId(eventData, routingKey);
                } catch (e) {
                    log.error(`Worker ${this.queueName}`, `Gagal mem-parsing payload pesan: ${e instanceof Error ? e.message : String(e)}`);
                }

                try {
                    log.info(`Worker ${this.queueName}`, 'Menerima tugas:', eventData || 'Payload tidak valid');

                    await this.processMessage(eventData, routingKey);

                    channel.ack(msg);
                    log.success(`Worker ${this.queueName}`, `Tugas berhasil diproses untuk ID: ${messageId}`);
                    this.retryMap.delete(messageId);

                } catch (error: unknown) {
                    const retryCount = this.retryMap.get(messageId) || 0;
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    log.error(
                        `Worker ${this.queueName}`, 
                        `Gagal memproses (Retry ${retryCount}/${this.maxRetries}): ${errorMsg}`
                    );

                    if (retryCount < this.maxRetries) {
                        this.retryMap.set(messageId, retryCount + 1);
                        channel.nack(msg, false, true);
                    } else {
                        try {
                            await this.onMaxRetriesExhausted(eventData, routingKey, error);
                        } catch (hookError) {
                            log.error(
                                `Worker ${this.queueName}`, 
                                `Error saat menjalankan onMaxRetriesExhausted: ${hookError instanceof Error ? hookError.message : String(hookError)}`
                            );
                        }

                        channel.nack(msg, false, false);
                        log.error(`Worker ${this.queueName}`, `Gagal setelah ${this.maxRetries} retry, masuk ke DLX`);
                        this.retryMap.delete(messageId);

                        const emitDlqUpdated = new EmitDlqUpdatedUseCase();
                        await emitDlqUpdated.execute({ messageId, routingKey });
                    }
                }
            }, {noAck: false});

        } catch (error: unknown) {
            log.error(`Worker ${this.queueName}`, `Gagal menyalakan subscriber: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}