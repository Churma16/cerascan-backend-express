import { BaseRabbitSubscriber } from "./base.subscriber";
import { paymentService } from "../services/payment.service";

export class PaymentDBSubscriber extends BaseRabbitSubscriber {
    protected readonly exchangeName = 'cerascan_events';
    protected readonly queueName = 'payment_db_updater_queue';
    protected readonly routingKeys = ['payment.success'];

    protected getMessageId(eventData: any, routingKey: string): string {
        return `${eventData.orderId}`;
    }

    protected async processMessage(eventData: any, routingKey: string): Promise<void> {
        await paymentService.processPaymentWebhookEvent(eventData);
    }
}
