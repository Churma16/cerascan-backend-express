import {getRabbitChannel} from "../config/rabbitmq_client";
import {UserService} from "../modules/user/user.service";


export class PaymentSubscriber {
    private static readonly EXCHANGE_NAME = 'cerascan_events';
    private static readonly QUEUE_NAME = 'payment_db_updater_queue';
    private static readonly ROUTING_KEY = 'payment.success';

    static async start(): Promise<void> {
        try {
            const channel = getRabbitChannel();

            // 1. Buat antrean/kotak surat khusus untuk tugas update DB ini
            await channel.assertQueue(this.QUEUE_NAME, {
                durable: true // Antrean tidak hilang walau server restart
            });

            // 2. Ikat (Bind) kotak surat ke Pusat Siaran dengan kunci 'payment.success'
            await channel.bindQueue(this.QUEUE_NAME, this.EXCHANGE_NAME, this.ROUTING_KEY);

            console.log(`[Worker] Mendengarkan event '${this.ROUTING_KEY}' di antrean '${this.QUEUE_NAME}'...`);

            // 3. Mulai mengambil pesan yang masuk
            channel.consume(this.QUEUE_NAME, async (msg) => {
                if (msg !== null) {
                    try {
                        // Buka isi pesan (Buffer -> String -> JSON)
                        const eventData = JSON.parse(msg.content.toString());
                        console.log(`[Worker] Menerima tugas pembaruan pembayaran:`, eventData);

                        // Ekstrak userId dari orderId (Contoh: ORDER-12-PAID-17123456)
                        const segments = eventData.orderId.split("-");
                        const userId = Number(segments[1]);

                        // 4. Update Database menggunakan Service yang sudah Anda buat sebelumnya
                        await UserService.upgradeTier(userId, 'paid');
                        console.log(`[Worker] Berhasil mengupdate User ID ${userId} ke Premium.`);

                        // 5. Beri tahu RabbitMQ bahwa tugas selesai dengan aman (Acknowledge)
                        channel.ack(msg);

                    } catch (error: unknown) {
                        console.error(`[Worker] Gagal memproses pembaruan DB:`, error);

                        // Jika gagal (misal DB down), kembalikan pesan ke antrean (Negative Acknowledge)
                        // Parameter true di belakang artinya "Tolong antrekan ulang"
                        channel.nack(msg, false, true);
                    }
                }
            });
        } catch (error: unknown) {
            console.error('[Worker] Gagal menyalakan subscriber:', error);
        }
    }
}