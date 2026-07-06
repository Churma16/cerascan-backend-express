import { MqttClient } from 'mqtt';
import { IAnalyticsPublisher, AnalyticsPayload } from './IAnalyticsPublisher';
import { getMQTTClient } from '../../../../config/mqttClient';

export class HiveMqAnalyticsPublisher implements IAnalyticsPublisher {
    private client!: MqttClient;
    private topic = 'ceramic/defect/analytics';

    async connect(): Promise<void> {
        this.client = getMQTTClient();
    }

    async publish(data: AnalyticsPayload): Promise<void> {
        try {
            const payload = JSON.stringify({
                ...data,
                timestamp: new Date().toISOString()
            });

            this.client.publish(this.topic, payload, { qos: 1 }, (err) => {
                if (err) {
                    console.error('❌ [MQTT Publisher] Gagal mengirim pesan ke HiveMQ:', err.message);
                } else {
                    console.log(`📤 [MQTT Publisher] Berhasil mengirim pesan analitik untuk scan_id: ${data.scan_id}`);
                }
            });
        } catch (error: any) {
            console.error('❌ [MQTT Publisher] Error saat publish:', error.message);
        }
    }

    async disconnect(): Promise<void> {
        // Disconnect
    }
}