import {Request, Response} from "express";
import {sendResponse} from "../../utils/response";
import {snap} from "../../config/midtrans_client";
import {PAID_TIER_CONFIG} from "../../config/packages.config";
import {AuthRequest} from "../../middleware/auth.guard";
import {UserService} from "../user/user.service";

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

            // Ekstrak userId dari format ORDER-userId-PAID-timestamp
            const segments = orderId.split("-");
            const userId = segments[1];

            if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
                if (fraudStatus === 'accept' || !fraudStatus) {
                    await UserService.upgradeTier(userId, 'paid');
                    console.log(`User ${userId} berhasil upgrade ke Paid Tier`);
                }
            } else if (['cancel', 'deny', 'expire'].includes(transactionStatus)) {
                console.log(`Transaksi ${orderId} gagal atau kedaluwarsa`);
            }

            return sendResponse(res, 200, "Webhook diterima");
            // return res.status(200).json({status: "OK"});
        } catch (error: any) {
            return sendResponse(res, 500, error.message);
            // return res.status(500).json({error: error.message});
        }
    }
}