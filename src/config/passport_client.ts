import passport from 'passport';
import {Strategy as GoogleStrategy} from 'passport-google-oauth20';
import dotenv from 'dotenv';
import {HandleGoogleLoginUseCase} from "../modules/auth/use-cases/HandleGoogleLoginUseCase";

dotenv.config();

export const initPassport = (): void => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.error('[Passport] ERROR FATAL: GOOGLE_CLIENT_ID atau GOOGLE_CLIENT_SECRET tidak ditemukan!');
        return;
    }

    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID as string,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
                callbackURL: '/api/auth/google/callback',
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    const useCase = new HandleGoogleLoginUseCase();
                    const user = await useCase.execute(profile);
                    return done(null, user);
                } catch (error: any) {
                    console.error('\n[Passport] Gagal melakukan autentikasi Google:');
                    console.error('Pesan Asli:', error.message);

                    if (error.name === 'SequelizeDatabaseError') {
                        console.error(
                            '[Passport] DIAGNOSA: Terjadi masalah pada struktur tabel. Kemungkinan besar kolom seperti googleId, sub_tier, atau plan_id belum ditambahkan lewat migrasi.'
                        );
                    }

                    return done(error, false);
                }
            }
        )
    );

    console.log('[Passport] Google OAuth2 Strategy berhasil diinisialisasi.');
};