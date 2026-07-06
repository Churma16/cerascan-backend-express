import * as mqtt from 'mqtt';

let mqttClient: mqtt.MqttClient | null = null;

export const connectMQTT = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
        try {
            const brokerUrl = process.env.MQTT_BROKER_URL;
            const port = parseInt(process.env.MQTT_PORT || '8883');
            const username = process.env.MQTT_USERNAME;
            const password = process.env.MQTT_PASSWORD;

            if (!brokerUrl) {
                console.log('ℹ️ [MQTT] Broker URL tidak diset. Dilewati.');
                return resolve();
            }

            console.log('🔌 [MQTT] Mencoba menghubungkan ke HiveMQ Cloud...');

            mqttClient = mqtt.connect(brokerUrl, {
                port: port,
                username: username,
                password: password,
                clean: false,
                clientId: process.env.KAFKA_CLIENT_ID || 'ceramic-scan-app-prod',
                connectTimeout: 5000,
                reconnectPeriod: 5000,
            });

            mqttClient.on('connect', () => {
                console.log('🍃 [MQTT] Client berhasil terhubung ke HiveMQ Cloud.');
                resolve();
            });

            mqttClient.on('error', (err) => {
                console.error('❌ [MQTT] Error pada koneksi HiveMQ:', err.message);
                reject(err);
            });
        } catch (error) {
            console.error('❌ [MQTT] Gagal menginisialisasi MQTT client:', error);
            reject(error);
        }
    });
};

export const getMQTTClient = (): mqtt.MqttClient => {
    if (!mqttClient) {
        throw new Error('MQTT Client belum diinisialisasi. Pastikan connectMQTT() sudah dipanggil.');
    }
    return mqttClient;
};