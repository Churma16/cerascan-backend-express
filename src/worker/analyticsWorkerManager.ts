
import {connectKafkaProducer} from "../config/kafkaClient";
import {startAnalyticsConsumer} from "./kafka/kafkaAnalytics.worker";
import {startSqlConsumer} from "./kafka/kafkaSql.worker";
import {startSocketConsumer} from "./kafka/kafkaSocket.worker";
import {connectRabbitMQ} from "../config/rabbitmqClient";
import {startRabbitSqlConsumer} from "./rabbitmq/rabbitSql.worker";
import {startRabbitSocketConsumer} from "./rabbitmq/rabbitSocket.worker";
import {startRabbitAnalyticsConsumer} from "./rabbitmq/rabbitAnalytics.worker";
import {log} from "../utils/logger";

export const startAnalyticsWorker = async (): Promise<void> => {
    const env = process.env.NODE_ENV || 'development';

    try {
        if (env === 'production') {
            log.info('Worker Manager', 'Start (RabbitMQ Streams)...');
            await connectRabbitMQ();
            
            startRabbitAnalyticsConsumer().catch(err => {
                log.error('Worker Manager', 'Gagal menjalankan RabbitMQ Analytics Consumer:', err);
            });
            
            startRabbitSqlConsumer().catch(err => {
                log.error('Worker Manager', 'Gagal menjalankan RabbitMQ SQL Consumer:', err);
            });
            
            startRabbitSocketConsumer().catch(err => {
                log.error('Worker Manager', 'Gagal menjalankan RabbitMQ Socket Consumer:', err);
            });
        } else {
            log.info('Worker Manager', 'Start (Kafka)...');
            await connectKafkaProducer();
            
            startAnalyticsConsumer().catch((err: any) => {
                log.error('Worker Manager', 'Gagal menjalankan Kafka Analytics Consumer:', err);
            });
            
            startSqlConsumer().catch((err: any) => {
                log.error('Worker Manager', 'Gagal menjalankan Kafka SQL Consumer:', err);
            });
            
            startSocketConsumer().catch((err: any) => {
                log.error('Worker Manager', 'Gagal menjalankan Kafka Socket Consumer:', err);
            });
        }
    } catch (error: any) {
        log.error('Worker Manager', `Gagal menginisialisasi infrastruktur broker: ${error.message}`);
    }
};