import {Channel} from 'amqplib';
import { log } from '../../utils/logger';

export class RabbitMQHelper {
    static async setupQueueWithDLX(
        channel: Channel,
        queueName: string,
        exchangeName: string,
        routingKey: string,
        dlxName: string
    ) {
        try {
            await channel.deleteQueue(queueName);
            log.info('RabbitMQ', `Dev Mode: Queue lama '${queueName}' dihapus`);
        } catch (err) {
        }

        await channel.assertQueue(queueName, {
            durable: true,
            arguments: {
                'x-dead-letter-exchange': dlxName
            }
        });

        await channel.bindQueue(queueName, exchangeName, routingKey);
    }
}
