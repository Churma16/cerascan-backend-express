
// import {connectMQTT} from '../config/mqtt_client';
// import {startMQTTAnalyticsConsumer} from './mqtt_analytics.worker';
import {connectKafkaProducer} from "../config/kafka.client";
import {startAnalyticsConsumer} from "./kafka/kafka_analytics.worker";
import {startSqlConsumer} from "./kafka/kafka_sql.worker";
import {startSocketConsumer} from "./kafka/kafka_socket.worker";
import {connectRabbitMQ} from "../config/rabbitmq_client";
import {startRabbitSqlConsumer} from "./rabbitmq/rabbit_sql.worker";
import {startRabbitSocketConsumer} from "./rabbitmq/rabbit_socket.worker";
import {startRabbitAnalyticsConsumer} from "./rabbitmq/rabbit_analytics.worker";
import {log} from "../utils/logger";

export const startAnalyticsWorker = async (): Promise<void> => {
    const env = process.env.NODE_ENV || 'development';

    try {
        if (env === 'production') {
            log.info('Worker Manager', 'Memulai infrastruktur event-driven Production (RabbitMQ Streams)...');
            await connectRabbitMQ();
            
            // Start 3 Parallel RabbitMQ Stream Workers
            startRabbitAnalyticsConsumer().catch(err => {
                log.error('Worker Manager', 'Gagal menjalankan RabbitMQ Analytics Consumer:', err);
            });
            
            startRabbitSqlConsumer().catch(err => {
                log.error('Worker Manager', 'Gagal menjalankan RabbitMQ SQL Consumer:', err);
            });
            
            startRabbitSocketConsumer().catch(err => {
                log.error('Worker Manager', 'Gagal menjalankan RabbitMQ Socket Consumer:', err);
            });
        } else {
            log.info('Worker Manager', 'Memulai infrastruktur event-driven Development (Kafka)...');
            await connectKafkaProducer();
            
            // Start 3 Parallel Kafka Workers
            startAnalyticsConsumer().catch((err: any) => {
                log.error('Worker Manager', 'Gagal menjalankan Kafka Analytics Consumer:', err);
            });
            
            startSqlConsumer().catch((err: any) => {
                log.error('Worker Manager', 'Gagal menjalankan Kafka SQL Consumer:', err);
            });
            
            startSocketConsumer().catch((err: any) => {
                log.error('Worker Manager', 'Gagal menjalankan Kafka Socket Consumer:', err);
            });
        }
    } catch (error: any) {
        log.error('Worker Manager', `Gagal menginisialisasi infrastruktur broker: ${error.message}`);
    }
};