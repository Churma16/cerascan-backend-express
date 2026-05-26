import {Request, Response} from "express";
import {sendResponse} from "../../utils/response";
import {snap} from "../../config/midtrans_client";
import {PAID_TIER_CONFIG} from "../../config/packages.config";
import {AuthRequest} from "../../middleware/auth.guard";
import {RabbitMQService} from "../rabbitmq/rabbitmq.service";

export class PaymentController {
    static async createTransaction(req: AuthRequest, res: Response) {
        try {
            // Frontend cukup kirim userId yang sedang login
            const userId = req.user?.id;

            if (!userId) {
                return sendResponse(res, 400, "User ID tidak boleh kosong");
            }

            // Harga dan detail diambil langsung dari config backend yang aman
            const secureAmount = PAID_TIER_CONFIG.price;
            const orderId = `ORDER-${userId}-PAID-${Date.now()}`;

            const parameter = {
                transaction_details: {
                    order_id: orderId,
                    gross_amount: secureAmount
                },
                item_details: [{
                    id: PAID_TIER_CONFIG.id,
                    price: secureAmount,
                    quantity: 1,
                    name: PAID_TIER_CONFIG.name
                }],
                customer_details: {
                    first_name: `User ID: ${userId}`,
                    email: "user@example.com" // Nanti bisa ditarik dari database sesuai userId jika mau riil
                }
            };

            // Generate token dari Midtrans
            const transaction = await snap.createTransaction(parameter);

            return sendResponse(res, 200, "Token transaksi berhasil dibuat", {
                token: transaction.token,
                redirect_url: transaction.redirect_url
            });
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
        }
    }

    static async handleWebhook(req: Request, res: Response) {
        try {
            const notification = req.body;
            const statusResponse = await snap.transaction.notification(notification);

            const orderId = statusResponse.order_id;
            const transactionStatus = statusResponse.transaction_status;
            const fraudStatus = statusResponse.fraud_status;

            if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
                if (fraudStatus === 'accept' || !fraudStatus) {

                    // Siapkan bungkusan data yang akan disiarkan
                    const eventData = {
                        orderId: orderId,
                        status: transactionStatus,
                        timestamp: new Date().toISOString()
                    };

                    // Teriakkan event ke RabbitMQ dengan kunci 'payment.success'
                    await RabbitMQService.publishEvent('payment.success', eventData);
                }
            }

            // Express bisa langsung merespons Midtrans dengan sangat cepat!
            return sendResponse(res, 200, "Webhook diterima, tugas dikirim ke antrean latar belakang");
        } catch (error: unknown) {
            if (error instanceof Error) {
                return sendResponse(res, 500, error.message);
            }
            return sendResponse(res, 500, "Terjadi kesalahan internal pada webhook");
        }
    }
}