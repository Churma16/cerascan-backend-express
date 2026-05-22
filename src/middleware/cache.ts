import {NextFunction, Request, Response} from 'express';
import {redisClient} from '../config/redis_client';
import {sendResponse, sendResponseMulti} from '../utils/response';

export class CacheMiddleware {
    /**
     * Middleware dinamis untuk mengecek cache Redis.
     * @param keyPrefix Prefix untuk nama key di Redis
     * @param isMulti Gunakan true jika data berupa array (sendResponseMulti)
     */
    static checkCache(keyPrefix: string, isMulti: boolean = false) {
        return async (req: Request, res: Response, next: NextFunction) => {
            const cacheKey = keyPrefix;

            try {
                const cachedData = await redisClient.get(cacheKey);

                if (cachedData) {
                    console.log(`Hit Cache: ${cacheKey}`);
                    const parsedData = JSON.parse(cachedData);

                    if (isMulti) {
                        return sendResponseMulti(res, 200, "Data berhasil diambil dari cache", parsedData);
                    }
                    return sendResponse(res, 200, "Data berhasil diambil dari cache", parsedData, 'cache');
                }
                next();
            } catch (error) {
                console.error('Redis Cache Error:', error);
                next();
            }
        };
    }
}