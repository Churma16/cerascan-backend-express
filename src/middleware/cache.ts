import {NextFunction, Request, Response} from 'express';
import {getRedisClient} from '../config/redis_client';
import {sendResponse, sendResponseMulti} from '../utils/response';

export class CacheMiddleware {
    /**
     * Middleware dinamis untuk mengecek cache Redis.
     * @param keyPrefix Prefix untuk nama key di Redis
     * @param isMulti Gunakan true jika data berupa array (sendResponseMulti)
     */
    static checkCache(keyPrefix: string, isMulti: boolean = false) {
        return async (req: Request, res: Response, next: NextFunction) => {
            const userId = req.user?.id;
            const userRole = req.user?.role;
            let cacheKey = keyPrefix;

            if (userId && (keyPrefix === 'dashboard:kpi' || keyPrefix === 'dashboard:trend')) {
                cacheKey = `${keyPrefix}:${userId}`;
            }

            try {
                const cachedData = await getRedisClient().get(cacheKey);

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