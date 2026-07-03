import {IAnalyticsPublisher} from './IAnalyticsPublisher';
import {KafkaStreamEventPublisher} from './KafkaStreamEventPublisher';
import {log} from '../../../utils/logger';
import {RabbitStreamEventPublisher} from "./RabbitStreamEventPublisher";

export class AnalyticsPublisherFactory {
    private static instance: IAnalyticsPublisher;

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