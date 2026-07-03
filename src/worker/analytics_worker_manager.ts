// File: src/worker/analytics_worker_manager.ts
import {connectMQTT} from '../config/mqtt_client';
import {startMQTTAnalyticsConsumer} from './mqtt_analytics.worker';
import {connectKafkaProducer} from "../config/kafka.client";
import {startAnalyticsConsumer} from "./kafka_analytics.worker";
import {startSqlConsumer} from "./kafka_sql.worker";
import {startSocketConsumer} from "./kafka_socket.worker";

export const startAnalyticsWorker = async (): Promise<void> => {
    const env = process.env.NODE_ENV || 'development';

    try {
        if (env === 'production') {
            console.log('[Worker Manager] Memulai infrastruktur event-driven Production (HiveMQ)...');
            await connectMQTT();
            startMQTTAnalyticsConsumer().catch(err => {
                console.error('[Worker Manager] Gagal menjalankan HiveMQ Consumer:', err);
            });
            // CATATAN: Karena menggunakan HiveMQ di Production, pastikan SQL dan Socket memiliki worker MQTT juga,
            // atau dipanggil manual jika belum diimplementasi.
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