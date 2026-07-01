import {createClient} from 'redis';

let redisClient: any = null;

export const connectRedis = async (): Promise<void> => {
    try {
        const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

        redisClient = createClient({
            url: redisUrl
        });

        redisClient.on('error', (err: any) => console.error('[Redis] Redis Client Error:', err));
        redisClient.on('connect', () => log.success('Redis', 'Koneksi ke Redis berhasil.'));

        await redisClient.connect();

        log.success('Redis', 'Client berhasil terhubung');
    } catch (error: unknown) {
        console.error('[Redis] Client gagal terhubung:', error);
        process.exit(1);
    }
};

// Fungsi ini digunakan oleh Service untuk mengambil client yang sudah aktif
export const getRedisClient = (): any => {
    if (!redisClient) {
        throw new Error('Redis client belum diinisialisasi. Pastikan connectRedis() sudah dipanggil.');
    }
    return redisClient;
};
