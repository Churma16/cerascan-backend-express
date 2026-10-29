import { AiScanSubscriber } from "./queue/aiScan.subscriber";
import { PaymentFulfillmentSubscriber } from "./queue/paymentFulfillment.subscriber";
import { PaymentEmailSubscriber } from "./queue/paymentEmail.subscriber";
import { PaymentNotificationSubscriber } from "./queue/paymentNotification.subscriber";
import { startScanStreamWorkers } from "./streams/scanStreamManager";
import { log } from "../utils/logger.util";

/**
 * Memulai seluruh AMQP Task Queue Subscribers dan Stream Workers
 * sesuai dengan konfigurasi environment (Kafka di dev, RabbitMQ Streams di prod).
 *
 * @async
 * @function startAllSubscribers
 * @returns {Promise<void>}
 */
export const startAllSubscribers = async (): Promise<void> => {
    try {
        log.info("Subscribers", "Memulai inisialisasi semua subscribers dan workers...");

        // 1. Inisialisasi AMQP Task Queue Subscribers
        const paymentFulfillmentSubscriber = new PaymentFulfillmentSubscriber();
        await paymentFulfillmentSubscriber.start();

        const paymentEmailSubscriber = new PaymentEmailSubscriber();
        await paymentEmailSubscriber.start();

        const paymentNotificationSubscriber = new PaymentNotificationSubscriber();
        await paymentNotificationSubscriber.start();

        const aiScanSubscriber = new AiScanSubscriber();
        await aiScanSubscriber.start();

        // 2. Inisialisasi Stream Workers (Kafka di development, RabbitMQ Streams di production)
        await startScanStreamWorkers();

        log.success("Subscribers", "Seluruh subscribers dan stream workers berhasil diaktifkan.");
    } catch (error: any) {
        log.error("Subscribers", `Gagal menginisialisasi subscriber: ${error.message}`);
    }
};

export {
    AiScanSubscriber,
    PaymentFulfillmentSubscriber,
    PaymentEmailSubscriber,
    PaymentNotificationSubscriber,
    startScanStreamWorkers
};
