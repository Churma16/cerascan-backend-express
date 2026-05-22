import {createClient} from 'redis';

export const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('Koneksi ke Redis berhasil.'));

(async () => {
    try {
        await redisClient.connect();
    } catch (error) {
        console.error('Gagal melakukan koneksi awal ke Redis:', error);
    }
})();