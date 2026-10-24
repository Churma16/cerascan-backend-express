import { AiScanSubscriber } from "./aiScan.subscriber";
import { PaymentDBSubscriber } from "./paymentDb.subscriber";
import { PaymentEmailSubscriber } from "./paymentEmail.subscriber";
import { PaymentSocketSubscriber } from "./paymentSocket.subscriber";
import { startAnalyticsWorker } from "../worker/analyticsWorkerManager";
import { log } from "../utils/logger";

/**
 * Memulai seluruh RabbitMQ Event Subscribers dan Stream Workers
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
        const paymentDbSubscriber = new PaymentDBSubscriber();
        await paymentDbSubscriber.start();

        const paymentEmailSubscriber = new PaymentEmailSubscriber();
        await paymentEmailSubscriber.start();

        const paymentSocketSubscriber = new PaymentSocketSubscriber();
        await paymentSocketSubscriber.start();

        const aiScanSubscriber = new AiScanSubscriber();
        await aiScanSubscriber.start();

        // 2. Inisialisasi Stream Workers (Kafka untuk development, RabbitMQ Streams untuk production)
        await startAnalyticsWorker();

        log.success("Subscribers", "Seluruh subscribers dan stream workers berhasil diaktifkan.");
    } catch (error: any) {
        log.error("Subscribers", `Gagal menginisialisasi subscriber: ${error.message}`);
    }
};

export {
    AiScanSubscriber,
    PaymentDBSubscriber,
    PaymentEmailSubscriber,
    PaymentSocketSubscriber,
    startAnalyticsWorker
};
