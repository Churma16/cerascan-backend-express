import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

export class EmailHelper {
    static async sendVerificationEmail(toEmail: string, fullName: string, verificationLink: string) {
        try {
            const data = await resend.emails.send({
                from: 'CeraScan <noreply@churma.codes>',
                to: toEmail,
                subject: 'Verifikasi Email untuk Akun CeraScan Anda',
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
            console.error('Gagal mengirim email via Resend:', error);
            return { success: false, error };
        }
    }

    static async sendOtpEmail(toEmail: string, userName: string, otpCode: string) {
        try {
            const data = await resend.emails.send({
                from: 'CeraScan <noreply@churma.codes>',
                to: toEmail,
                subject: 'Kode OTP Reset Password CeraScan',
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
                `,
            });
            return { success: true, data };
        } catch (error) {
            console.error('Gagal mengirim email via Resend:', error);
            return { success: false, error };
        }
    }
}
