import { BaseRabbitSubscriber } from "../base.subscriber";
import { paymentService } from "../../services/payment.service";

export class PaymentFulfillmentSubscriber extends BaseRabbitSubscriber {
    protected readonly exchangeName = 'cerascan_events';
    protected readonly queueName = 'payment_fulfillment_queue';
    protected readonly routingKeys = ['payment.success'];

    protected getMessageId(eventData: any, routingKey: string): string {
        return `${eventData?.orderId || 'unknown'}`;
    }

    protected async processMessage(eventData: any, routingKey: string): Promise<void> {
        await paymentService.processPaymentWebhookEvent(eventData);
    }
}
