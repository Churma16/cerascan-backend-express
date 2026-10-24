import { Server, Socket } from "socket.io";
import { quotaService } from "../../services/quota.service";
import { log } from "../../utils/logger.util";

export const setupSocketHandlers = (io: Server) => {
    io.on("connection", (socket: Socket) => {
        log.info("Socket", `Klien terhubung: ${socket.id}`);

        handleUserAuthentication(socket);

        socket.on("disconnect", () => {
            log.info("Socket", `Klien terputus: ${socket.id}`);
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
        log.info("Socket", `User ${userId} berhasil masuk ke room: ${roomName}`);

        quotaService.broadcastLiveQuota(Number(userId)).catch((err: any) => {
            log.error("Socket", "Gagal mengirim kuota awal:", err);
        });
    } else {
        log.info("Socket", "Klien terhubung tanpa userId (Guest)");
    }
};
