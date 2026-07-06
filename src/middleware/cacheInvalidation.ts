import {NextFunction, Request, Response} from "express";
import {getRedisClient} from "../config/redisClient";

export const invalidateTrendCache = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const redis = getRedisClient();
        const keys = await redis.keys('dashboard:trend*');
        if (keys.length > 0) {
            await redis.del(keys);
            console.log(`Cache invalidated: ${keys.join(', ')}`);
        }
        next();
    } catch (error) {
        console.error('Cache invalidation error:', error);
        next();
    }
};

export const invalidateKey = (keyPattern: any) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        const redis = getRedisClient();
        await redis.del(keyPattern);
        next();
    } catch (error) {
        next();
    }
};