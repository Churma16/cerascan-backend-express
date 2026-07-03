// File: src/worker/analytics_worker_manager.ts
import {connectMQTT} from '../config/mqtt_client';
import {startMQTTAnalyticsConsumer} from './mqtt_analytics.worker';
import {connectKafkaProducer} from "../config/kafka.client";
import {startAnalyticsConsumer} from "./kafka_analytics.worker";

/**
 * Fungsi tunggal untuk mengaktifkan Message Broker & Consumer analitik
 * berdasarkan environment (Development vs Production)
 */
export const startAnalyticsWorker = async (): Promise<void> => {
    const env = process.env.NODE_ENV || 'development';

    try {
        if (env === 'production') {
            console.log('ℹ️ [Worker Manager] Memulai infrastruktur analitik Production (HiveMQ)...');
            await connectMQTT();
            startMQTTAnalyticsConsumer().catch(err => {
                console.error('❌ [Worker Manager] Gagal menjalankan HiveMQ Consumer:', err);
            });
        } else {
            await connectMQTT();
            startMQTTAnalyticsConsumer().catch(err => {
                console.error('❌ [Worker Manager] Gagal menjalankan HiveMQ Consumer:', err);
            });
            // console.log('ℹ️ [Worker Manager] Memulai infrastruktur analitik Development (Kafka)...');
            // await connectKafkaProducer();
            // startAnalyticsConsumer().catch((err: any) => {
            //     console.error('❌ [Worker Manager] Gagal menjalankan Kafka Consumer:', err);
            // });
        }
    } catch (error: any) {
        console.error('❌ [Worker Manager] Gagal menginisialisasi infrastruktur analitik:', error.message);
        // Kita tidak melakukan process.exit(1) di sini agar server Express utama tetap bisa menyala
        // meskipun broker analitik mengalami kendala saat startup.
    }
};