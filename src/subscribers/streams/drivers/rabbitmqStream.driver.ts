import { connectRabbitMQ, getRabbitChannel } from "../../../config/rabbitmqClient";
import { log } from "../../../utils/logger.util";
import { IStreamConsumerDriver, StreamConsumerItem } from "./streamDriver.interface";

/**
 * Driver stream consumer berbasis RabbitMQ Streams (digunakan untuk lingkungan production).
 */
export class RabbitMQStreamDriver implements IStreamConsumerDriver {
    async start(streamTarget: string, consumers: StreamConsumerItem[]): Promise<void> {
        await connectRabbitMQ();
        const channel = getRabbitChannel();

        if (!channel) {
            log.error("RabbitMQ Stream Driver", "RabbitMQ Channel tidak tersedia.");
            return;
        }

        const exchangeName = `${streamTarget}-exchange`;
        await channel.assertExchange(exchangeName, "fanout", { durable: true });

        await channel.prefetch(100);

        for (const consumerDef of consumers) {
            await this.registerConsumer(channel, streamTarget, exchangeName, consumerDef);
        }
    }

    private async registerConsumer(
        channel: any,
        streamTarget: string,
        exchangeName: string,
        consumerDef: StreamConsumerItem
    ): Promise<void> {
        try {
            const queueName = `${streamTarget}-${consumerDef.groupId}`;

            await channel.assertQueue(queueName, {
                durable: true,
                arguments: { "x-queue-type": "stream" }
            });

            await channel.bindQueue(queueName, exchangeName, "");

            await channel.consume(
                queueName,
                async (msg: any) => {
                    await this.processMessage(channel, msg, consumerDef);
                },
                {
                    noAck: false,
                    arguments: { "x-stream-offset": "next" }
                }
            );

            log.info("RabbitMQ Stream Driver", `Consumer aktif: [${consumerDef.name}] di queue '${queueName}'`);
        } catch (error: any) {
            log.error("RabbitMQ Stream Driver", `Gagal mendaftarkan consumer [${consumerDef.name}]: ${error.message}`);
        }
    }

    private async processMessage(channel: any, msg: any, consumerDef: StreamConsumerItem): Promise<void> {
        if (!msg) {
            return;
        }

        const contentString = msg.content?.toString();
        if (!contentString) {
            channel.ack(msg);
            return;
        }

        try {
            const payload = JSON.parse(contentString);
            await consumerDef.handler(payload);
            channel.ack(msg);
        } catch (err: any) {
            log.error(`RabbitMQ Stream [${consumerDef.name}]`, `Gagal memproses pesan: ${err.message}`);
            channel.nack(msg, false, false);
        }
    }
}
