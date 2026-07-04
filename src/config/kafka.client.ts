import { Kafka, Producer, logLevel, Partitioners } from 'kafkajs';
import { log } from '../utils/logger';

let kafkaProducer: Producer | null = null;

const brokers = process.env.KAFKA_BROKERS
    ? process.env.KAFKA_BROKERS.split(',')
    : ['localhost:9092'];

const customKafkaLogger = () => {
    return ({ namespace, level, label, log: logData }: any) => {
        const { message, ...extra } = logData;

        // Ignore the partitioner warning since we explicitly pass it
        if (message.includes('switched default partitioner') || message.includes('KAFKAJS_NO_PARTITIONER_WARNING')) {
            return;
        }

        const tag = `Kafka${namespace ? `[${namespace}]` : ''}`;

        if (level === logLevel.ERROR) {
            log.error(tag, message, Object.keys(extra).length ? extra : '');
        } else if (level === logLevel.WARN) {
            log.warn(tag, message);
        } else if (level === logLevel.INFO) {
            log.info(tag, message);
        }
    };
};

export const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'ceramic-scan-app',
    brokers: brokers,
    logCreator: customKafkaLogger,
    logLevel: logLevel.WARN, // Restrict to warning/error to keep console clean
});

export const connectKafkaProducer = async (): Promise<void> => {
    try {
        kafkaProducer = kafka.producer({
            createPartitioner: Partitioners.LegacyPartitioner
        });
        await kafkaProducer.connect();
        log.success('Kafka', 'Producer berhasil terhubung');
    } catch (error) {
        log.error('Kafka', 'Producer gagal terhubung:', error);
        process.exit(1);
    }
};

export const getKafkaProducer = (): Producer => {
    if (!kafkaProducer) {
        throw new Error('Producer Kafka belum diinisialisasi. Pastikan connectKafkaProducer() sudah dipanggil.');
    }
    return kafkaProducer;
};