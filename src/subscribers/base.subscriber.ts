import {getRabbitChannel} from "../config/rabbitmq_client";
import {RabbitMQClient} from "../modules/rabbitmq/infrastructure/rabbitmq.client";

export abstract class BaseRabbitSubscriber {
    protected abstract readonly exchangeName: string;
    protected abstract readonly queueName: string;
    protected abstract readonly routingKey: string;

    protected readonly maxRetries: number = 3;
    private retryMap = new Map<string, number>();

    // Method wajib yang harus diisi oleh kelas anak untuk memproses data
    protected abstract processMessage(eventData: any): Promise<void>;

    // Method wajib untuk mengambil ID unik dari payload (untuk tracking retry)
    protected abstract getMessageId(eventData: any): string;

    async start(): Promise<void> {
        try {
            const channel = getRabbitChannel();

            // Catatan: Menghapus antrean di production sangat berisiko karena
            // pesan yang belum diproses akan hilang saat server restart.
            // Gunakan ini hanya untuk environment development.
            if (process.env.NODE_ENV !== 'production') {
                try {
                    await channel.deleteQueue(this.queueName);
                    console.log(`[Worker] Queue lama '${this.queueName}' dihapus`);
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

            await channel.bindQueue(this.queueName, this.exchangeName, this.routingKey);

            console.log(`[Worker] Mendengarkan event '${this.routingKey}' di antrean '${this.queueName}'...`);

            await channel.consume(this.queueName, async (msg:any) => {
                if (!msg) return;

                const eventData = JSON.parse(msg.content.toString());
                const messageId = this.getMessageId(eventData);

                try {
                    console.log(`[Worker ${this.queueName}] Menerima tugas:`, eventData);

                    await this.processMessage(eventData);

                    channel.ack(msg);
                    console.log(`[Worker ${this.queueName}] Tugas berhasil diproses untuk ID: ${messageId}`);
                    this.retryMap.delete(messageId);

                } catch (error: unknown) {
                    const retryCount = this.retryMap.get(messageId) || 0;
                    console.error(
                        `[Worker ${this.queueName}] Gagal memproses (Retry ${retryCount}/${this.maxRetries}):`,
                        error
                    );

                    if (retryCount < this.maxRetries) {
                        this.retryMap.set(messageId, retryCount + 1);
                        channel.nack(msg, false, true);
                    } else {
                        channel.nack(msg, false, false);
                        console.error(`[Worker ${this.queueName}] Gagal setelah ${this.maxRetries} retry, masuk ke DLX`);
                        this.retryMap.delete(messageId);
                    }
                }
            }, {noAck: false});

        } catch (error: unknown) {
            console.error(`[Worker ${this.queueName}] Gagal menyalakan subscriber:`, error);
        }
    }
}