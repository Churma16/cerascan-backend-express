import { connectKafkaProducer } from "../config/kafkaClient";
import { startAnalyticsConsumer } from "./kafka/kafkaAnalytics.worker";
import { startSqlConsumer } from "./kafka/kafkaSql.worker";
import { startSocketConsumer } from "./kafka/kafkaSocket.worker";
import { connectRabbitMQ } from "../config/rabbitmqClient";
import { startRabbitmqSqlConsumer } from "./rabbitmq/rabbitmqSql.worker";
import { startRabbitmqSocketConsumer } from "./rabbitmq/rabbitmqSocket.worker";
import { startRabbitmqAnalyticsConsumer } from "./rabbitmq/rabbitmqAnalytics.worker";
import { log } from "../utils/logger.util";

/**
 * Menginisialisasi dan menjalankan worker analitik stream berdasarkan environment.
 * Menggunakan RabbitMQ Streams jika berjalan di mode `production`,
 * dan menggunakan Kafka jika berjalan di mode `development`.
 *
 * @async
 * @function startScanStreamWorkers
 * @returns {Promise<void>}
 */
export const startScanStreamWorkers = async (): Promise<void> => {
    const isProduction = process.env.NODE_ENV === "production";

    try {
        if (isProduction) {
            log.info("Worker Manager", "Memulai Stream Worker (RabbitMQ Streams - Production)...");
            await connectRabbitMQ();

            startRabbitmqAnalyticsConsumer().catch(err => {
                log.error("Worker Manager", "Gagal menjalankan RabbitMQ Analytics Consumer:", err);
            });

            startRabbitmqSqlConsumer().catch(err => {
                log.error("Worker Manager", "Gagal menjalankan RabbitMQ SQL Consumer:", err);
            });

            startRabbitmqSocketConsumer().catch(err => {
                log.error("Worker Manager", "Gagal menjalankan RabbitMQ Socket Consumer:", err);
            });
        } else {
            log.info("Worker Manager", "Memulai Stream Worker (Kafka - Development)...");
            const isKafkaConnected = await connectKafkaProducer();

            if (isKafkaConnected) {
                startAnalyticsConsumer().catch((err: any) => {
                    log.error("Worker Manager", "Gagal menjalankan Kafka Analytics Consumer:", err);
                });

                startSqlConsumer().catch((err: any) => {
                    log.error("Worker Manager", "Gagal menjalankan Kafka SQL Consumer:", err);
                });

                startSocketConsumer().catch((err: any) => {
                    log.error("Worker Manager", "Gagal menjalankan Kafka Socket Consumer:", err);
                });
            } else {
                log.warn(
                    "Worker Manager",
                    "Kafka tidak terhubung. Stream worker Kafka dilewati; fallback in-memory akan digunakan saat event selesai."
                );
            }
        }
    } catch (error: any) {
        log.error("Worker Manager", `Gagal menginisialisasi infrastruktur broker: ${error.message}`);
    }
};
