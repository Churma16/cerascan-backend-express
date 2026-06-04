// file: src/config/passport_client.ts

import passport from 'passport';
import {Strategy as GoogleStrategy} from 'passport-google-oauth20';
import User from '../models/user.model';
import dotenv from 'dotenv';

dotenv.config();

export const initPassport = (): void => {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID as string,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
                callbackURL: '/api/auth/google/callback',
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    let user = await User.findOne({where: {googleId: profile.id}});
                    if (user) return done(null, user);

                    const email = profile.emails?.[0].value;
                    user = await User.findOne({where: {email}});

                    if (user) {
                        user.googleId = profile.id;
                        user.avatar = profile.photos?.[0].value || user.avatar;
                        await user.save();
                        return done(null, user);
                    }

                    user = await User.create({
                        full_name: profile.displayName,
                        email: email as string,
                        googleId: profile.id,
                        avatar: profile.photos?.[0].value,
                        role: 'user',
                        sub_tier: 'free',
                        plan_id: 1,
                        verified_at: new Date(),
                    });

                    return done(null, user);
                } catch (error) {
                    return done(error, false);
                }
            }
        )
    );
    console.log('[Passport] Google OAuth2 Strategy berhasil diinisialisasi.');
};