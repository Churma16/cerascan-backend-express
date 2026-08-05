import { IAnalyticsPublisher } from './publisher/IAnalyticsPublisher';
import { KafkaStreamEventPublisher } from './publisher/KafkaStreamEventPublisher';
import { log } from '../../../utils/logger';
import { RabbitStreamEventPublisher } from "./publisher/RabbitStreamEventPublisher";

/**
 * Factory class singleton untuk membuat dan mengembalikan instansi publisher analitik yang sesuai
 * berdasarkan environment (`development` -> Kafka, `production` -> RabbitMQ Streams).
 */
export class AnalyticsPublisherFactory {
    private static instance: IAnalyticsPublisher;

    /**
     * Mengambil atau membuat instansi publisher analitik tunggal (Singleton).
     *
     * @static
     * @returns {IAnalyticsPublisher} Instansi publisher analitik (Kafka atau RabbitMQ).
     */
    public static getPublisher(): IAnalyticsPublisher {
        if (!this.instance) {
            const env = process.env.NODE_ENV || 'development';

            if (env === 'production') {
                log.info('Publisher Factory', 'Menggunakan RabbitMQ Streams (Production Mode)');
                this.instance = new RabbitStreamEventPublisher();
            } else {
                log.info('Publisher Factory', 'Menggunakan Kafka Publisher (Development Mode)');
                this.instance = new KafkaStreamEventPublisher();
            }
        }
        return this.instance;
    }
}