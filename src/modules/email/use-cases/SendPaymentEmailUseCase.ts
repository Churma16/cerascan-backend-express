import { Plan } from "../../../models";
import { GetUserByIdUseCase } from "../../user/use-cases/GetUserByIdUseCase";
import { resend } from "../../../config/resend_client";
import { formatIDRCurrency } from "../domain/email.domain";

export class SendPaymentEmailUseCase {
    async execute(orderId: string) {
        try {
            const segments = orderId.split("-");
            const userId = Number(segments[1]);
            const planId = Number(segments[2]);

            const getUserByIdUseCase = new GetUserByIdUseCase();
            const user = await getUserByIdUseCase.execute(userId);
            if (!user) throw new Error(`User ID ${userId} tidak ditemukan`);

            const plan = await Plan.findByPk(planId);
            const planName = plan ? plan.name : 'Premium';
            const planPrice = plan ? plan.price : 5000;

            const formattedPrice = formatIDRCurrency(planPrice);

            const data = await resend.emails.send({
                from: 'CeraScan <noreply@churma.codes>',
                to: user.email,
                subject: `Pembayaran Berhasil! Selamat Datang di CeraScan ${planName}`,
                html: `
                    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
                        <h2 style="color: #133F3C; text-align: center;">Pembayaran Berhasil</h2>
                        
                        <p>Halo <strong>${user.full_name}</strong>,</p>
                        <p>Terima kasih telah melakukan peningkatan akun. Pembayaran Anda untuk paket <strong>${planName}</strong> telah berhasil kami terima.</p>
                        
                        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                             <p style="margin: 0 0 10px 0; color: #133F3C;"><strong>Detail Transaksi:</strong></p>
                             <table style="width: 100%; border-collapse: collapse;">
                                 <tr>
                                     <td style="padding: 5px 0; color: #666;">Order ID</td>
                                     <td style="padding: 5px 0; text-align: right; font-weight: bold;">${orderId}</td>
                                 </tr>
                                 <tr>
                                     <td style="padding: 5px 0; color: #666;">Paket Layanan</td>
                                     <td style="padding: 5px 0; text-align: right; font-weight: bold;">${planName}</td>
                                 </tr>
                                 <tr>
                                     <td style="padding: 5px 0; border-top: 1px solid #ddd; margin-top: 5px; color: #666;">Total Pembayaran</td>
                                     <td style="padding: 5px 0; border-top: 1px solid #ddd; margin-top: 5px; text-align: right; font-weight: bold; color: #133F3C;">${formattedPrice}</td>
                                 </tr>
                             </table>
                        </div>
                        
                        <p>Sekarang Anda dapat menikmati pemindaian tanpa batas kuota dan prioritas pemrosesan AI kami.</p>
                        
                        <div style="text-align: center; margin-top: 30px;">
                            <a href="http://localhost:5173/dashboard" style="background-color: #133F3C; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">Mulai Pindai Sekarang</a>
                        </div>
                        
                        <p style="margin-top: 40px; font-size: 12px; color: #888; text-align: center;">
                            Jika Anda memiliki kendala, silakan hubungi tim dukungan kami.<br>
                            &copy; ${new Date().getFullYear()} CeraScan. All rights reserved.
                        </p>
                    </div>
                `
            });

            console.log(`[Email Service] Kuitansi terkirim ke ${user.email}`);
            return data;

        } catch (error) {
            console.error(`[Email Service] Gagal mengirim email:`, error);
            throw error;
        }
    }
}
