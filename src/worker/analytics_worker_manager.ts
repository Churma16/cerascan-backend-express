
// import {connectMQTT} from '../config/mqtt_client';
// import {startMQTTAnalyticsConsumer} from './mqtt_analytics.worker';
import {connectKafkaProducer} from "../config/kafka.client";
import {startAnalyticsConsumer} from "./kafka_analytics.worker";
import {startSqlConsumer} from "./kafka_sql.worker";
import {startSocketConsumer} from "./kafka_socket.worker";
import {connectRabbitMQ} from "../config/rabbitmq_client";
import {startRabbitSqlConsumer} from "./rabbit_sql.worker";
import {startRabbitSocketConsumer} from "./rabbit_socket.worker";
import {startRabbitAnalyticsConsumer} from "./rabbit_analytics.worker";

export const startAnalyticsWorker = async (): Promise<void> => {
    const env = process.env.NODE_ENV || 'development';

    try {
        if (env === 'production') {
            console.log('[Worker Manager] Memulai infrastruktur event-driven Production (RabbitMQ Streams)...');
            await connectRabbitMQ();
            
            // Start 3 Parallel RabbitMQ Stream Workers
            startRabbitAnalyticsConsumer().catch(err => {
                console.error('[Worker Manager] Gagal menjalankan RabbitMQ Analytics Consumer:', err);
            });
            
            startRabbitSqlConsumer().catch(err => {
                console.error('[Worker Manager] Gagal menjalankan RabbitMQ SQL Consumer:', err);
            });
            
            startRabbitSocketConsumer().catch(err => {
                console.error('[Worker Manager] Gagal menjalankan RabbitMQ Socket Consumer:', err);
            });
        } else {
            console.log('[Worker Manager] Memulai infrastruktur event-driven Development (Kafka)...');
            await connectKafkaProducer();
            
            // Start 3 Parallel Kafka Workers
            startAnalyticsConsumer().catch((err: any) => {
                console.error('[Worker Manager] Gagal menjalankan Kafka Analytics Consumer:', err);
            });
            
            startSqlConsumer().catch((err: any) => {
                console.error('[Worker Manager] Gagal menjalankan Kafka SQL Consumer:', err);
            });
            
            startSocketConsumer().catch((err: any) => {
                console.error('[Worker Manager] Gagal menjalankan Kafka Socket Consumer:', err);
            });
        }
    } catch (error: any) {
        console.error('[Worker Manager] Gagal menginisialisasi infrastruktur broker:', error.message);
    }
};