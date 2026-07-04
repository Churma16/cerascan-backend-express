import { BaseRabbitSubscriber } from "./base.subscriber";
import { SendPaymentEmailUseCase } from "../modules/email/use-cases/SendPaymentEmailUseCase";

export class PaymentEmailSubscriber extends BaseRabbitSubscriber {
    protected readonly exchangeName = 'cerascan_events';
    protected readonly queueName = 'payment_email_notifier_queue';
    protected readonly routingKeys = ['payment.success'];

    protected getMessageId(eventData: any, routingKey: string): string {
        return `${eventData.orderId}`;
    }

    protected async processMessage(eventData: any, routingKey: string): Promise<void> {
        const sendPaymentEmailUseCase = new SendPaymentEmailUseCase();
        await sendPaymentEmailUseCase.execute(eventData.orderId);
    }
}
