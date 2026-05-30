import {Server as SocketIOServer} from 'socket.io';
import http from 'http';

// Simpan instance secara global di memori file ini
let io: SocketIOServer | null = null;

// Fungsi ini dipanggil sekali saat server Express baru menyala
export const initSocket = (server: http.Server): void => {
    io = new SocketIOServer(server, {
        cors: {
            origin: ['https://ceramic.churma.codes',
                'http://localhost:3000',
                'http://localhost:5173'],
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log(`[Socket] Klien terhubung: ${socket.id}`);

        socket.on('disconnect', () => {
            console.log(`[Socket] Klien terputus: ${socket.id}`);
        });
    });

    console.log('[Socket] WebSocket Server berhasil diinisialisasi.');
};

// Fungsi ini digunakan oleh Subscriber/Worker untuk menembakkan sinyal
export const getSocket = (): SocketIOServer => {
    if (!io) {
        throw new Error('Socket.io belum diinisialisasi. Pastikan initSocket() sudah dipanggil di app.ts.');
    }
    return io;
};