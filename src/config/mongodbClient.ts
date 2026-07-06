import mongoose from 'mongoose';
import { log } from '../utils/logger';

export const connectMongoDB = async (): Promise<void> => {
    try {
        const host = process.env.MONGO_HOST || 'localhost';
        const port = process.env.MONGO_PORT || '27017';
        const dbName = process.env.MONGO_DB_NAME || 'ceramic_analytics';
        const user = process.env.MONGO_USER;
        const password = process.env.MONGO_PASSWORD;

        let uri = '';
        if (user && password) {
            uri = `mongodb://${user}:${password}@${host}:${port}/${dbName}?authSource=admin`;
        } else {
            uri = `mongodb://${host}:${port}/${dbName}`;
        }

        await mongoose.connect(uri);
        log.success('MongoDB', `🍃 Berhasil terhubung ke database: ${dbName} di ${host}:${port}`);
    } catch (error) {
        console.error('❌ [MongoDB] Gagal terhubung ke database:', error);
        process.exit(1);
    }
};