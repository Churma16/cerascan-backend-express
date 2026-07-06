import app from './app';
import http from 'http';
import sequelize from './config/databaseClient';
import dotenv from 'dotenv';

import './models/scan.model';
import './models/user.model';
import {connectRabbitMQ} from "./config/rabbitmqClient";
import {connectRedis} from "./config/redisClient";
import {initSocket} from "./config/websocketClient"; // BARU: Import inisialisasi Socket.io
import {RabbitmqPublisher} from "./modules/rabbitmq/infrastructure/rabbitmq.publisher";
import {PaymentDBSubscriber} from "./subscribers/paymentDb.subscribers";
import {PaymentEmailSubscriber} from "./subscribers/paymentEmail.subscriber";
import {PaymentSocketSubscriber} from "./subscribers/paymentSocket.subscriber";
import {AiScanSubscriber} from "./subscribers/aiScan.subcriber";
import {CronWorker} from "./worker/daily_cron.worker";
import {initPassport} from "./config/passportClient";
import {connectMongoDB} from "./config/mongodbClient";
import {log} from "./utils/logger";
import {startAnalyticsWorker} from "./worker/analyticsWorkerManager";

dotenv.config({ quiet: true } as any);

// SET GLOBAL TIMEZONE
process.env.TZ = 'Asia/Jakarta';

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
        await RabbitmqPublisher.setupExchange();

        await startAnalyticsWorker();


        // Nyalakan semua Subscriber
        const paymentDB = new PaymentDBSubscriber();
        await paymentDB.start();

        const paymentEmail = new PaymentEmailSubscriber();
        await paymentEmail.start();

        const paymentSocket = new PaymentSocketSubscriber();
        await paymentSocket.start();

        const aiScan = new AiScanSubscriber();
        await aiScan.start();

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