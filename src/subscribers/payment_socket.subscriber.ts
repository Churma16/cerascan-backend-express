import { BaseRabbitSubscriber } from "./base.subscriber";
import { EmitPaymentSuccessUseCase } from "../modules/notification/use-cases/EmitPaymentSuccessUseCase";
import { EmitPaymentFailedUseCase } from "../modules/notification/use-cases/EmitPaymentFailedUseCase";

export class PaymentSocketSubscriber extends BaseRabbitSubscriber {
    protected readonly exchangeName = 'cerascan_events';
    protected readonly queueName = 'payment_socket_notifier_queue';
    protected readonly routingKeys = ['payment.success', 'payment.failed'];

    protected getMessageId(eventData: any, routingKey: string): string {
        return `${eventData?.orderId || 'unknown'}-${routingKey}`;
    }

    protected async processMessage(eventData: any, routingKey: string): Promise<void> {
        if (routingKey === 'payment.success') {
            const emitSuccessUseCase = new EmitPaymentSuccessUseCase();
            await emitSuccessUseCase.execute(eventData);
        } else if (routingKey === 'payment.failed') {
            const emitFailedUseCase = new EmitPaymentFailedUseCase();
            await emitFailedUseCase.execute(eventData);
        }
    }
}
