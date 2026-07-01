import { Kafka, Producer, logLevel } from 'kafkajs';

let kafkaProducer: Producer | null = null;

const brokers = process.env.KAFKA_BROKERS
    ? process.env.KAFKA_BROKERS.split(',')
    : ['localhost:9092'];

const customKafkaLogger = () => {
    return ({ namespace, level, label, log }: any) => {
        const { message, ...extra } = log;

        if (level === logLevel.ERROR) {
            console.error(` Kafka[${namespace}] ${message}`, Object.keys(extra).length ? extra : '');
        } else if (level === logLevel.WARN) {
            console.warn(` Kafka[${namespace}] ${message}`);
        }
    };
};

export const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'ceramic-scan-app',
    brokers: brokers,
    logCreator: customKafkaLogger, 
});

export const connectKafkaProducer = async (): Promise<void> => {
    try {
        kafkaProducer = kafka.producer();
        await kafkaProducer.connect();
        console.log(' Kafka  Producer berhasil terhubung');
    } catch (error) {
        console.error(' Kafka  Producer gagal terhubung:', error);
        process.exit(1);
    }
};

export const getKafkaProducer = (): Producer => {
    if (!kafkaProducer) {
        throw new Error('Producer Kafka belum diinisialisasi. Pastikan connectKafkaProducer() sudah dipanggil.');
    }
    return kafkaProducer;
};