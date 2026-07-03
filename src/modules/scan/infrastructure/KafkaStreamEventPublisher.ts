// File: src/modules/scan/infrastructure/KafkaAnalyticsPublisher.ts
import { Producer } from 'kafkajs';
import { IAnalyticsPublisher, AnalyticsPayload } from './IAnalyticsPublisher';
import {getKafkaProducer} from "../../../config/kafka.client";

export class KafkaStreamEventPublisher implements IAnalyticsPublisher {
    private producer!: Producer;
    private topic = 'ceramic-scan-completed';

    async connect(): Promise<void> {
        this.producer = getKafkaProducer();
    }

    async publish(data: AnalyticsPayload): Promise<void> {
        try {
            await this.producer.send({
                topic: this.topic,
                messages: [
                    {
                        key: data.scan_id,
                        value: JSON.stringify({
                            ...data,
                            timestamp: new Date().toISOString()
                        })
                    }
                ]
            });
            console.log(`[Kafka Producer] Berhasil mengirim pesan analitik untuk scan_id: ${data.scan_id}`);
        } catch (error: any) {
            console.error('[Kafka Producer] Gagal mengirim pesan:', error.message);
        }
    }

    async disconnect(): Promise<void> {
        // Disconnect opsional, bisa dihandle global saat shutdown server
    }
}