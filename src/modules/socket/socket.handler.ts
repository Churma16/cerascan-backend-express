// config/socket.handler.ts (atau letakkan di tempat yang sesuai arsitektur Anda)

import {Server, Socket} from 'socket.io';
import { BroadcastUserLiveQuotaUseCase } from "../user_quota/use-cases/BroadcastUserLiveQuotaUseCase";

export const setupSocketHandlers = (io: Server) => {
    io.on('connection', (socket: Socket) => {
        console.log(`[Socket] Klien terhubung: ${socket.id}`);

        // Panggil fungsi-fungsi modular di sini
        handleUserAuthentication(socket);

        // Jika nanti ada fitur lain, tinggal tambahkan di sini:
        // handleChatSystem(socket);
        // handleNotificationSystem(socket);

        socket.on('disconnect', () => {
            console.log(`[Socket] Klien terputus: ${socket.id}`);
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
        console.log(`[Socket] User ${userId} berhasil masuk ke room: ${roomName}`);

        // Tembakkan data awal khusus untuk module Quota
        const broadcastUserLiveQuotaUseCase = new BroadcastUserLiveQuotaUseCase();
        broadcastUserLiveQuotaUseCase.execute(Number(userId)).catch(err => {
            console.error('[Socket] Gagal mengirim kuota awal:', err);
        });

    } else {
        console.log(`[Socket] Klien terhubung tanpa userId (Guest)`);
    }
};