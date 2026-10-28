import { NotificationService } from "../services/notification.service";
import { BaseRabbitSubscriber } from "./base.subscriber";



export class PaymentNotificationSubscriber extends BaseRabbitSubscriber {
    protected readonly exchangeName = 'cerascan_events';
    protected readonly queueName = 'payment_notification_queue';
    protected readonly routingKeys = ['payment.success', 'payment.failed'];

    protected getMessageId(eventData: any, routingKey: string): string {
        return `${eventData?.orderId || 'unknown'}-${routingKey}`;
    }

    protected async processMessage(eventData: any, routingKey: string): Promise<void> {
        if (routingKey === 'payment.success') {
            await NotificationService.emitPaymentSuccess(eventData);
        } else if (routingKey === 'payment.failed') {
            await NotificationService.emitPaymentFailed(eventData);
        }
    }
}
