// file: src/config/passport_client.ts

import passport from 'passport';
import {Strategy as GoogleStrategy} from 'passport-google-oauth20';
import User from '../models/user.model';
import dotenv from 'dotenv';

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
                    const email = profile.emails?.[0]?.value;
                    if (!email) {
                        console.warn(`[Passport] Peringatan: Profil Google ID ${profile.id} tidak membagikan akses email.`);
                        return done(new Error('Email wajib disertakan dari akun Google'), false);
                    }

                    let user = await User.findOne({where: {googleId: profile.id}});
                    if (user) return done(null, user);

                    user = await User.findOne({where: {email}});

                    if (user) {
                        user.googleId = profile.id;
                        user.avatar = profile.photos?.[0]?.value || user.avatar;
                        await user.save();
                        return done(null, user);
                    }

                    user = await User.create({
                        full_name: profile.displayName || 'Pengguna Baru',
                        email: email,
                        googleId: profile.id,
                        avatar: profile.photos?.[0]?.value || null,
                        role: 'user',
                        sub_tier: 'free',
                        plan_id: 1,
                        verified_at: new Date(),
                    });

                    return done(null, user);
                } catch (error: any) {
                    console.error('\n[Passport] Gagal melakukan autentikasi Google:');
                    console.error('Pesan Asli:', error.message);

                    if (error.name === 'SequelizeDatabaseError') {
                        console.error(
                            '[Passport] DIAGNOSA: Terjadi masalah pada struktur tabel. Kemungkinan besar kolom seperti googleId, sub_tier, atau plan_id belum ditambahkan lewat migrasi.');
                    }

                    return done(error, false);
                }
            }
        )
    );
    console.log('[Passport] ✅ Google OAuth2 Strategy berhasil diinisialisasi.');
};