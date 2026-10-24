import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import { authService } from "../services/auth.service";
import { log } from "../utils/logger.util";

dotenv.config();

export const initPassport = (): void => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        log.warn("Passport", "GOOGLE_CLIENT_ID atau GOOGLE_CLIENT_SECRET tidak ditemukan!");
        return;
    }

    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID as string,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
                callbackURL: "/api/auth/google/callback",
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    const authenticatedUser = await authService.handleGoogleAuth(profile);
                    return done(null, authenticatedUser);
                } catch (error: any) {
                    log.error("Passport", "Gagal melakukan autentikasi Google", error);

                    if (error.name === "SequelizeDatabaseError") {
                        log.error(
                            "Passport",
                            "DIAGNOSA: Terjadi masalah pada struktur tabel. Kemungkinan besar kolom seperti googleId, sub_tier, atau plan_id belum ditambahkan lewat migrasi."
                        );
                    }

                    return done(error, false);
                }
            }
        )
    );

    log.info("Passport", "Google OAuth2 Strategy berhasil diinisialisasi.");
};
