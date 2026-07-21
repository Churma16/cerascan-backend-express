
import {Server, Socket} from 'socket.io';
import { BroadcastUserLiveQuotaUseCase } from '../userQuota/use-cases/BroadcastUserLiveQuotaUseCase';
import {log} from "../../utils/logger";

export const setupSocketHandlers = (io: Server) => {
    io.on('connection', (socket: Socket) => {
        log.info('Socket', `Klien terhubung: ${socket.id}`);

        handleUserAuthentication(socket);

        // Jika nanti ada fitur lain, tinggal tambahkan di sini:
        // handleChatSystem(socket);
        // handleNotificationSystem(socket);

        socket.on('disconnect', () => {
            log.info('Socket', `Klien terputus: ${socket.id}`);
        });
    });
};

/**
 * Logika khusus untuk menangani masuknya user ke Room dan inisialisasi awal
 */
const handleUserAuthentication = (socket: Socket) => {
    const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId;

    if (userId) {
        const roomName = `user_${userId}_quota_left`;

        socket.join(roomName);
        log.info('Socket', `User ${userId} berhasil masuk ke room: ${roomName}`);

        const broadcastUserLiveQuotaUseCase = new BroadcastUserLiveQuotaUseCase();
        broadcastUserLiveQuotaUseCase.execute(Number(userId)).catch(err => {
            log.error('Socket', 'Gagal mengirim kuota awal:', err);
        });

    } else {
        log.info('Socket', 'Klien terhubung tanpa userId (Guest)');
    }
};