import { getMQTTClient } from '../config/mqttClient';
import { handleAnalyticsMessage, AnalyticsPayload } from './handlers/analytics.handler';

const TOPIC_NAME = 'ceramic/defect/analytics';

/**
 * Menjalankan MQTT Consumer untuk mendengarkan topik analitik cacat keramik.
 * Ketika pesan masuk diterima, data di-parse dan diproses menggunakan shared analytics handler.
 *
 * @async
 * @function startMQTTAnalyticsConsumer
 * @returns {Promise<void>}
 */
export const startMQTTAnalyticsConsumer = async (): Promise<void> => {
    try {
        const client = getMQTTClient();

        // Subscribe ke topik dengan QoS 1 (At Least Once)
        client.subscribe(TOPIC_NAME, { qos: 1 }, (err) => {
            if (err) {
                console.error(`[MQTT Consumer] Gagal subscribe ke topik ${TOPIC_NAME}:`, err.message);
            } else {
                console.log(`[MQTT Consumer] Mendengarkan topik: ${TOPIC_NAME}`);
            }
        });

        // Mendengarkan pesan masuk
        client.on('message', async (topic, message) => {
            if (topic !== TOPIC_NAME) return;

            try {
                const messageVal = message.toString();
                if (!messageVal) return;

                const payload: AnalyticsPayload = JSON.parse(messageVal);
                console.log(`[MQTT Consumer] Memproses analitik scan_id: ${payload.scan_id}`);

                await handleAnalyticsMessage(payload);
                console.log(`[MQTT Consumer] Berhasil memproses analitik untuk scan_id: ${payload.scan_id}`);
            } catch (err: any) {
                console.error('[MQTT Consumer] Gagal memproses pesan analitik:', err.message);
            }
        });

    } catch (error) {
        console.error('[MQTT Consumer] Gagal menjalankan consumer:', error);
    }
};