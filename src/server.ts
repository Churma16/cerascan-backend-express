import app from './app';
import http from 'http'; // BARU: Import modul http bawaan Node.js
import sequelize from './config/database';
import dotenv from 'dotenv';

import './models/scan.model';
import './models/user.model';
import {connectRabbitMQ} from "./config/rabbitmq_client";
import {connectRedis} from "./config/redis_client";
import {initSocket} from "./config/websocket_client"; // BARU: Import inisialisasi Socket.io
import {RabbitMQClient} from "./modules/rabbitmq/infrastructure/rabbitmq.client";
import {PaymentDBSubscriber} from "./subscribers/payment_db.subscribers";
import {PaymentEmailSubscriber} from "./subscribers/payment_email.subscriber";
import {AiScanSubscriber} from "./subscribers/ai_scan.subcriber";
import {CronWorker} from "./worker/daily_cron.worker";
import {initPassport} from "./config/passport_client";
import {connectMongoDB} from "./config/mongodb_client";
import {log} from "./utils/logger";
import {startAnalyticsWorker} from "./worker/analytics_worker_manager";

dotenv.config();

// Nonaktifkan console.log di environment Production untuk keamanan dan performa
if (process.env.NODE_ENV === 'production') {
    console.log = () => {
    };
    console.info = () => {
    };
    console.debug = () => {
    };
}

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

initSocket(server);

const startServer = async () => {
    try {
        await sequelize.authenticate();
        log.success('MySql', 'Koneksi ke MySQL berhasil.');
        log.success('MySql', 'Semua model telah disinkronisasi dengan database.');

        await connectRedis();
        await connectRabbitMQ();
        await connectMongoDB();
        await RabbitMQClient.setupExchange();

        await startAnalyticsWorker();


        // Nyalakan semua Subscriber
        await PaymentDBSubscriber.start();
        await PaymentEmailSubscriber.start();
        await AiScanSubscriber.start();


        initPassport();

        CronWorker.start();

        log.info('FRONTEND_URL', `Frontend URL is ${process.env.FRONTEND_URL}`);

        server.listen(PORT, () => {
            log.system(`[GIN]API Gateway & WebSocket berjalan di http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Tidak dapat terhubung ke database:', error);
    }
};

startServer();