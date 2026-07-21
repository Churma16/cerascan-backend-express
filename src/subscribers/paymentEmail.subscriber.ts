import { EmailService } from "../services/email.service";
import { BaseRabbitSubscriber } from "./base.subscriber";


export class PaymentEmailSubscriber extends BaseRabbitSubscriber {
    protected readonly exchangeName = 'cerascan_events';
    protected readonly queueName = 'payment_email_notifier_queue';
    protected readonly routingKeys = ['payment.success'];

    protected getMessageId(eventData: any, routingKey: string): string {
        return `${eventData.orderId}`;
    }

    protected async processMessage(eventData: any, routingKey: string): Promise<void> {
        await EmailService.sendPaymentEmail(eventData.orderId);
    }
}
