// File: src/worker/analytics.worker.ts
import { AnalyticsModel } from '../models/analytics.model';
import {kafka} from "../config/kafka.client";
import { log } from '../utils/logger';

const consumer = kafka.consumer({ groupId: 'ceramic-analytics-group' });
const TOPIC_NAME = 'ceramic-defect-analytics';

export const startAnalyticsConsumer = async (): Promise<void> => {
    try {
        await consumer.connect();
        log.success('Kafka Consumer', 'Berhasil terhubung');

        await consumer.subscribe({ topic: TOPIC_NAME, fromBeginning: false });
        log.info('Kafka Consumer', `Mendengarkan topik: ${TOPIC_NAME}`);

        await consumer.run({
            eachMessage: async ({ message }) => {
                try {
                    const messageVal = message.value?.toString();
                    if (!messageVal) return;

                    const payload = JSON.parse(messageVal);
                    log.info('Kafka Consumer', `📩 Memproses analitik scan_id: ${payload.scan_id}`);

                    const analyticsData = new AnalyticsModel({
                        scan_id: payload.scan_id,
                        user_id: payload.user_id,
                        prediction: payload.prediction,
                        confidence_score: payload.confidence_score,
                        inference_time: payload.inference_time
                    });

                    await analyticsData.save();
                    log.success('MongoDB', `🍃 Data analitik scan_id: ${payload.scan_id} berhasil disimpan.`);
                } catch (err: any) {
                    console.error('❌ [Kafka Consumer] Gagal menyimpan ke MongoDB:', err.message);
                }
            },
        });
    } catch (error) {
        console.error('[Kafka Consumer] Gagal menjalankan consumer:', error);
    }
};