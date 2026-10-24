import { Kafka, Producer, logLevel, Partitioners } from "kafkajs";
import { log } from "../utils/logger";

let kafkaProducer: Producer | null = null;

const brokers = process.env.KAFKA_BROKERS
    ? process.env.KAFKA_BROKERS.split(",")
    : ["localhost:9092"];

const customKafkaLogger = () => {
    return ({ namespace, level, label, log: logData }: any) => {
        const { message, ...extra } = logData;

        if (message.includes("switched default partitioner") || message.includes("KAFKAJS_NO_PARTITIONER_WARNING")) {
            return;
        }

        const tag = `Kafka${namespace ? `[${namespace}]` : ""}`;

        if (level === logLevel.ERROR) {
            log.error(tag, message, Object.keys(extra).length ? extra : "");
        } else if (level === logLevel.WARN) {
            log.warn(tag, message);
        } else if (level === logLevel.INFO) {
            log.info(tag, message);
        }
    };
};

export const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || "ceramic-scan-app",
    brokers: brokers,
    logCreator: customKafkaLogger,
    logLevel: logLevel.WARN,
});

export const connectKafkaProducer = async (): Promise<boolean> => {
    try {
        kafkaProducer = kafka.producer({
            createPartitioner: Partitioners.LegacyPartitioner
        });
        await kafkaProducer.connect();
        log.success("Kafka", "Producer berhasil terhubung");
        return true;
    } catch (error) {
        log.error("Kafka", "Producer gagal terhubung:", error);
        kafkaProducer = null;
        return false;
    }
};

export const getKafkaProducer = (): Producer | null => {
    return kafkaProducer;
};
