import { IStreamConsumerDriver, StreamConsumerItem } from "./drivers/streamDriver.interface";
import { KafkaStreamDriver } from "./drivers/kafkaStream.driver";
import { RabbitMQStreamDriver } from "./drivers/rabbitmqStream.driver";
import { handleScanPersistenceMessage } from "./handlers/scanPersistence.handler";
import { handleScanAnalyticsMessage } from "./handlers/scanAnalytics.handler";
import { handleScanBroadcastMessage } from "./handlers/scanBroadcast.handler";
import { log } from "../../utils/logger.util";

const KAFKA_TOPIC_NAME = "ceramic-scan-completed";
const RABBIT_STREAM_NAME = "ceramic-scan-completed-stream";

const SCAN_STREAM_CONSUMERS: StreamConsumerItem[] = [
    {
        name: "Scan Persistence (SQL & Leaderboard)",
        groupId: "ceramic-sql-group",
        handler: handleScanPersistenceMessage
    },
    {
        name: "Scan Analytics (MongoDB & Redis Cache)",
        groupId: "ceramic-analytics-group",
        handler: handleScanAnalyticsMessage
    },
    {
        name: "Scan Broadcast (WebSocket & SSE)",
        groupId: "ceramic-socket-group",
        handler: handleScanBroadcastMessage
    }
];

/**
 * Menginisialisasi dan menjalankan seluruh stream worker analitik scan.
 * Memilih driver KafkaStreamDriver di development atau RabbitMQStreamDriver di production.
 *
 * @async
 * @function startScanStreamWorkers
 * @returns {Promise<void>}
 */
export const startScanStreamWorkers = async (): Promise<void> => {
    const isProduction = process.env.NODE_ENV === "production";
    const driver: IStreamConsumerDriver = isProduction 
        ? new RabbitMQStreamDriver() 
        : new KafkaStreamDriver();

    const streamTarget = isProduction ? RABBIT_STREAM_NAME : KAFKA_TOPIC_NAME;

    try {
        log.info(
            "Stream Manager", 
            `Memulai Stream Worker via ${isProduction ? "RabbitMQ Streams" : "Kafka"}...`
        );
        await driver.start(streamTarget, SCAN_STREAM_CONSUMERS);
    } catch (error: any) {
        log.error("Stream Manager", `Gagal menginisialisasi stream consumers: ${error.message}`);
    }
};
