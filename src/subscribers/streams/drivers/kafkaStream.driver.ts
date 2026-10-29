import { kafka, connectKafkaProducer } from "../../../config/kafkaClient";
import { log } from "../../../utils/logger.util";
import { IStreamConsumerDriver, StreamConsumerItem } from "./streamDriver.interface";

/**
 * Driver stream consumer berbasis Apache Kafka (digunakan untuk lingkungan lokal/development).
 */
export class KafkaStreamDriver implements IStreamConsumerDriver {
    async start(streamTarget: string, consumers: StreamConsumerItem[]): Promise<void> {
        const isKafkaConnected = await connectKafkaProducer();
        if (!isKafkaConnected) {
            log.warn(
                "Kafka Stream Driver",
                "Kafka tidak terhubung. Stream worker dilewati; in-memory fallback akan digunakan jika ada event."
            );
            return;
        }

        for (const consumerDef of consumers) {
            try {
                const consumer = kafka.consumer({ groupId: consumerDef.groupId });
                await consumer.connect();
                await consumer.subscribe({ topic: streamTarget, fromBeginning: false });

                await consumer.run({
                    eachMessage: async ({ message }) => {
                        const messageString = message.value?.toString();
                        if (!messageString) return;

                        try {
                            const payload = JSON.parse(messageString);
                            await consumerDef.handler(payload);
                        } catch (err: any) {
                            log.error(`Kafka Stream [${consumerDef.name}]`, `Gagal memproses pesan: ${err.message}`);
                        }
                    }
                });

                log.info("Kafka Stream Driver", `Consumer aktif: [${consumerDef.name}] di topik '${streamTarget}'`);
            } catch (error: any) {
                log.error(`Kafka Stream Driver`, `Gagal mendaftarkan consumer [${consumerDef.name}]: ${error.message}`);
            }
        }
    }
}
