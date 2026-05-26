import amqp from 'amqplib';

let rabbitConnection: any = null;
let rabbitChannel: any = null;

export const connectRabbitMQ = async (): Promise<void> => {
    try {
        const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost';

        rabbitConnection = await amqp.connect(rabbitmqUrl);
        if (rabbitConnection) {
            rabbitChannel = await rabbitConnection.createChannel();
        }

        console.log('[RabbitMQ] Client berhasil terhubung');
    } catch (error: unknown) {
        console.error('[RabbitMQ] Client gagal terhubung:', error);
        process.exit(1);
    }
};

// Fungsi ini digunakan oleh Service untuk mengambil channel yang sudah aktif
export const getRabbitChannel = (): any => {
    if (!rabbitChannel) {
        throw new Error('Channel RabbitMQ belum diinisialisasi. Pastikan connectRabbitMQ() sudah dipanggil.');
    }
    return rabbitChannel;
};