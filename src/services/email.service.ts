import { Plan } from "../models";
import { userRepository, UserRepository } from "../repositories/user.repository";
import { resend } from "../config/resendClient";
import { log } from "../utils/logger.util";

export const formatIDRCurrency = (price: number): string => {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0
    }).format(price);
};

export class EmailService {
    private static userRepo: UserRepository = userRepository;

    static async sendPaymentEmail(orderId: string): Promise<void> {
        try {
            const segments = orderId.split("-");
            const userId = Number(segments[1]);
            const planId = Number(segments[2]);

            const user = await this.userRepo.findByPk(userId);
            if (!user) throw new Error(`User ID ${userId} tidak ditemukan`);

            const plan = await Plan.findByPk(planId);
            const planName = plan ? plan.name : "Premium";
            const planPrice = plan ? plan.price : 5000;

            const formattedPrice = formatIDRCurrency(planPrice);

            await resend.emails.send({
                from: "CeraScan <noreply@churma.codes>",
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
                            <a href="https://ceramic.churma.codes/dashboard" style="background-color: #133F3C; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                                Buka Dashboard CeraScan
                            </a>
                        </div>
                        
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0 15px 0;" />
                        <p style="font-size: 11px; color: #888; text-align: center;">Ini adalah email otomatis. Harap jangan membalas email ini.</p>
                    </div>
                `
            });
            log.info("EmailService", `Payment confirmation email sent to ${user.email} for order ${orderId}`);
        } catch (error) {
            log.error("EmailService", `Failed to send payment email for order ${orderId}`, error);
        }
    }

    static async sendVerificationEmail(toEmail: string, fullName: string, verificationLink: string) {
        try {
            const data = await resend.emails.send({
                from: "CeraScan <noreply@churma.codes>",
                to: toEmail,
                subject: "Verifikasi Email untuk Akun CeraScan Anda",
                html: `
                    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 12px;">
                        <h2 style="color: #042B1F; margin-bottom: 5px;">CeraScan</h2>
                        <p style="color: #666; margin-top: 0;">Sistem Deteksi Cacat Keramik</p>                     
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />                        
                        <p>Halo <strong>${fullName}</strong>,</p>
                        <p>Terima kasih telah mendaftar di CeraScan. Untuk menyelesaikan proses pendaftaran dan mengaktifkan akun Anda, silakan verifikasi alamat email dengan menekan tombol di bawah ini:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${verificationLink}" style="display: inline-block; padding: 14px 28px; background-color: #042B1F; color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 10px; font-size: 15px;">
                                Verifikasi Email Saya
                            </a>
                        </div>
                        <p style="color: #666; font-size: 13px;">Tautan ini hanya berlaku selama <strong>24 jam</strong>. Jika Anda tidak merasa mendaftar di CeraScan, abaikan saja email ini.</p>
                        <div style="background-color: #FAFAFA; border: 1px solid #eee; padding: 15px; border-radius: 8px; margin-top: 25px; word-break: break-all;">
                            <p style="color: #999; font-size: 11px; margin: 0; margin-bottom: 5px;">Jika tombol di atas tidak berfungsi, salin dan tempel tautan berikut ke browser Anda:</p>
                            <a href="${verificationLink}" style="color: #FF645A; font-size: 11px; text-decoration: none;">${verificationLink}</a>
                        </div>                       
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />                       
                        <p style="color: #999; font-size: 11px; text-align: center;">Email ini dikirim otomatis oleh sistem CeraScan, mohon tidak membalas.</p>
                    </div>`
            });
            return { success: true, data };
        } catch (error) {
            log.error("EmailService", `Failed to send verification email to ${toEmail}`, error);
            return { success: false, error };
        }
    }

    static async sendOtpEmail(toEmail: string, userName: string, otpCode: string) {
        try {
            const data = await resend.emails.send({
                from: "CeraScan <noreply@churma.codes>",
                to: toEmail,
                subject: "Kode OTP Reset Password CeraScan",
                html: `
                    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 12px;">
                        <h2 style="color: #042B1F; margin-bottom: 5px;">CeraScan</h2>
                        <p style="color: #666; margin-top: 0;">Sistem Deteksi Cacat Keramik</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                        <p>Halo <strong>${userName}</strong>,</p>
                        <p>Kami menerima permintaan untuk mengatur ulang kata sandi akun Anda. Gunakan kode OTP di bawah ini untuk melanjutkan:</p>
                        <div style="background-color: #FAFAFA; border: 1px solid #eee; padding: 15px; text-align: center; border-radius: 12px; margin: 25px 0;">
                            <span style="font-size: 32px; font-weight: 900; letter-spacing: 4px; color: #FF645A;">${otpCode}</span>
                        </div>
                        <p style="color: #666; font-size: 13px;">Kode ini hanya berlaku selama <strong>10 menit</strong>. Demi keamanan akun Anda, jangan sebarkan kode ini kepada siapa pun.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                        <p style="color: #999; font-size: 11px; text-align: center;">Email ini dikirim otomatis oleh sistem CeraScan, mohon tidak membalas.</p>
                    </div>
                `
            });
            return { success: true, data };
        } catch (error) {
            log.error("EmailService", `Failed to send OTP email to ${toEmail}`, error);
            return { success: false, error };
        }
    }
}
