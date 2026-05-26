import app from './app';
import sequelize from './config/database';
import dotenv from 'dotenv';

import './models/scan.model';
import './models/user.model';
import {connectRabbitMQ} from "./config/rabbitmq_client";
import {connectRedis} from "./config/redis_client";
import {RabbitMQService} from "./modules/rabbitmq/rabbitmq.service";

dotenv.config();

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        // Check Connection
        await sequelize.authenticate();
        console.log('Koneksi ke MySQL berhasil.');

        // Sync Table
        await sequelize.sync();
        // await sequelize.sync({alter: true});
        console.log(' Semua model telah disinkronisasi dengan database.');

        await connectRedis();
        await connectRabbitMQ();
        await RabbitMQService.setupExchange();

        // Start Server
        app.listen(PORT, () => {
            console.log(`API Gateway berjalan di http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Tidak dapat terhubung ke database:', error);
    }
};

startServer();