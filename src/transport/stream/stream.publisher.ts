import { getRabbitChannel } from "../../config/rabbitmqClient";
import { getKafkaProducer } from "../../config/kafkaClient";
import { handleScanPersistenceMessage } from "../../subscribers/streams/handlers/scanPersistence.handler";
import { handleAnalyticsMessage } from "../../subscribers/streams/handlers/scanAnalytics.handler";
import { handleScanBroadcastMessage } from "../../subscribers/streams/handlers/scanBroadcast.handler";
import { log } from "../../utils/logger.util";

export interface ScanCompletedPayload {
    scan_id: string;
    user_id?: number;
    db_id?: number | string;
    prediction: string;
    confidence_score: number;
    inference_time: number | string;
}

export class StreamPublisher {
    private static readonly KAFKA_TOPIC = "ceramic-scan-completed";
    private static readonly RABBIT_STREAM_NAME = "ceramic-scan-completed-stream";

    /**
     * Menerbitkan event penyelesaian scan AI ke stream broker.
     * Menggunakan RabbitMQ Streams pada mode production,
     * dan menggunakan Kafka pada mode development/lokal.
     *
     * @static
     * @param {ScanCompletedPayload} payload - Data hasil inferensi scan AI.
     * @returns {Promise<void>}
     */
    static async publishScanCompleted(payload: ScanCompletedPayload): Promise<void> {
        const isProduction = process.env.NODE_ENV === "production";

        if (isProduction) {
            await this.publishToRabbitStream(payload);
        } else {
            await this.publishToKafka(payload);
        }
    }

    private static async publishToRabbitStream(payload: ScanCompletedPayload): Promise<void> {
        try {
            const channel = getRabbitChannel();
            if (!channel) {
                log.error("StreamPublisher", "RabbitMQ Channel belum terhubung, fallback eksekusi lokal.");
                await this.executeFallback(payload);
                return;
            }

            await channel.assertQueue(this.RABBIT_STREAM_NAME, {
                durable: true,
                arguments: { "x-queue-type": "stream" }
            });

            const messagePayload = {
                ...payload,
                timestamp: new Date().toISOString()
            };

            const success = channel.sendToQueue(
                this.RABBIT_STREAM_NAME,
                Buffer.from(JSON.stringify(messagePayload))
            );

            if (success) {
                log.success("StreamPublisher", `Event scan_id ${payload.scan_id} berhasil dikirim ke RabbitMQ Stream`);
            } else {
                log.warn("StreamPublisher", `Buffer stream penuh, event scan_id ${payload.scan_id} mungkin tertunda`);
            }
        } catch (error: any) {
            log.error("StreamPublisher", `Gagal mengirim ke RabbitMQ Stream: ${error.message}`);
            await this.executeFallback(payload);
        }
    }

    private static async publishToKafka(payload: ScanCompletedPayload): Promise<void> {
        try {
            const producer = getKafkaProducer();

            if (!producer) {
                log.warn(
                    "StreamPublisher",
                    "[Kafka] Producer tidak aktif di dev mode. Menjalankan handler secara langsung (local fallback)."
                );
                await this.executeFallback(payload);
                return;
            }

            await producer.send({
                topic: this.KAFKA_TOPIC,
                messages: [
                    {
                        key: payload.scan_id,
                        value: JSON.stringify({
                            ...payload,
                            timestamp: new Date().toISOString()
                        })
                    }
                ]
            });

            log.success("StreamPublisher", `Event scan_id ${payload.scan_id} berhasil dikirim ke Kafka topic '${this.KAFKA_TOPIC}'`);
        } catch (error: any) {
            log.error("StreamPublisher", `Gagal mengirim ke Kafka: ${error.message}. Menjalankan fallback lokal.`);
            await this.executeFallback(payload);
        }
    }

    /**
     * Fallback aman jika message broker stream sedang tidak terjangkau di environment pengembang.
     */
    private static async executeFallback(payload: ScanCompletedPayload): Promise<void> {
        try {
            await Promise.all([
                handleScanPersistenceMessage(payload),
                handleAnalyticsMessage({
                    scan_id: payload.scan_id,
                    user_id: payload.user_id || 0,
                    prediction: payload.prediction,
                    confidence_score: payload.confidence_score,
                    inference_time: payload.inference_time
                }),
                handleScanBroadcastMessage(payload)
            ]);
            log.info("StreamPublisher", `Fallback lokal selesai diproses untuk scan_id: ${payload.scan_id}`);
        } catch (fallbackError: any) {
            log.error("StreamPublisher", `Gagal mengeksekusi fallback lokal: ${fallbackError.message}`);
        }
    }
}
