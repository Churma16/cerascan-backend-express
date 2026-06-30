import User from "../../../models/user.model";
import { Profile } from "passport-google-oauth20";
import { InitiateFreePlanUseCase } from "../../subscription/use-cases/InitiateFreePlanUseCase";
import sequelize from "../../../config/database";
import { getRedisClient } from "../../../config/redis_client";

export class HandleGoogleLoginUseCase {
    async execute(profile: Profile) {
        const userEmail = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : '';

        if (!userEmail) {
            throw new Error("Email tidak ditemukan dari profil Google");
        }

        let user = await User.findOne({ where: { email: userEmail } });

        if (user) {
            if (!user.googleId) {
                user.googleId = profile.id;
                if (!user.avatar && profile.photos && profile.photos.length > 0) {
                    user.avatar = profile.photos[0].value;
                }

                if (!user.verified_at) {
                    user.verified_at = new Date();
                }
                await user.save();
            }
            return user;
        }

        const t = await sequelize.transaction();

        try {
            user = await User.create({
                full_name: profile.displayName,
                email: userEmail,
                googleId: profile.id,
                avatar: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : undefined,
                role: 'user',
                sub_tier: 'free',
                plan_id: 1,
                verified_at: new Date()
            }, { transaction: t });

            const initiateFreePlanUseCase = new InitiateFreePlanUseCase();
            await initiateFreePlanUseCase.execute(user.id, t);
            await t.commit();
            return user;
        } catch (error) {
            await t.rollback();
            if (user && user.id) {
                try {
                    const redis = getRedisClient();
                    await redis.del(`user:${user.id}:remaining_quota`);
                } catch (redisErr) {
                    console.error("Gagal menghapus cache Redis setelah rollback handleGoogleLogin:", redisErr);
                }
            }
            throw error;
        }
    }
}
