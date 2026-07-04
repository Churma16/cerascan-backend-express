import { BaseRabbitSubscriber } from "./base.subscriber";
import { ProcessPaymentWebhookUseCase } from "../modules/payment/use-cases/ProcessPaymentWebhookUseCase";

export class PaymentDBSubscriber extends BaseRabbitSubscriber {
    protected readonly exchangeName = 'cerascan_events';
    protected readonly queueName = 'payment_db_updater_queue';
    protected readonly routingKeys = ['payment.success'];

    protected getMessageId(eventData: any, routingKey: string): string {
        return `${eventData.orderId}`;
    }

    protected async processMessage(eventData: any, routingKey: string): Promise<void> {
        const processPaymentWebhookUseCase = new ProcessPaymentWebhookUseCase();
        await processPaymentWebhookUseCase.execute(eventData);
    }
}