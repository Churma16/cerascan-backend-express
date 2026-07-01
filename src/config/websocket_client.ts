// config/websocket_client.ts (Contoh path)

import {Server as SocketIOServer} from 'socket.io';
import http from 'http';
import {setupSocketHandlers} from "../modules/socket/socket.handler";
import { log } from '../utils/logger';

let io: SocketIOServer | null = null;

export const initSocket = (server: http.Server): void => {
    io = new SocketIOServer(server, {
        cors: {
            origin: [
                'https://ceramic.churma.codes',
                'http://localhost:3000',
                'http://localhost:5173'
            ],
            methods: ["GET", "POST"]
        }
    });

    setupSocketHandlers(io);

    log.info('Socket', 'WebSocket Server berhasil diinisialisasi.');
};

export const getSocket = (): SocketIOServer => {
    if (!io) {
        throw new Error('Socket.io belum diinisialisasi. Pastikan initSocket() sudah dipanggil di app.ts.');
    }
    return io;
};