import app from './app';
import sequelize from './config/database';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        // 1. Tes koneksi database
        await sequelize.authenticate();
        console.log('✅ Koneksi ke MySQL berhasil.');

        // 2. Sinkronisasi tabel (Jika tabel belum ada, Sequelize akan otomatis membuatnya!)
        await sequelize.sync({alter: true});
        console.log('✅ Semua model telah disinkronisasi dengan database.');

        // 3. Nyalakan server
        app.listen(PORT, () => {
            console.log(`🚀 API Gateway berjalan di http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Tidak dapat terhubung ke database:', error);
    }
};

startServer();