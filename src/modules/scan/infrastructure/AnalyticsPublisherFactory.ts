import {IAnalyticsPublisher} from './IAnalyticsPublisher';
import {KafkaAnalyticsPublisher} from './KafkaAnalyticsPublisher';
import { log } from '../../../utils/logger';

// import { HiveMqAnalyticsPublisher } from './HiveMqAnalyticsPublisher'; // nanti diimport kalau sudah ada

export class AnalyticsPublisherFactory {
    private static instance: IAnalyticsPublisher;

    public static getPublisher(): IAnalyticsPublisher {
        if (!this.instance) {
            const env = process.env.NODE_ENV || 'development';

            if (env === 'production') {
                // Nanti return new HiveMqAnalyticsPublisher();
                // Sementara kita arahkan ke Kafka atau buat penanda
                log.info('Publisher Factory', 'Menggunakan HiveMQ Publisher (Production Mode)');
                this.instance = new KafkaAnalyticsPublisher(); // Ganti ke HiveMQ jika file sudah siap
            } else {
                log.info('Publisher Factory', 'Menggunakan Kafka Publisher (Development Mode)');
                this.instance = new KafkaAnalyticsPublisher();
            }
        }
        return this.instance;
    }
}