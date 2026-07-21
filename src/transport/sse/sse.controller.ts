import { Request, Response } from 'express';
import { sseClient } from '../../config/sseClient';
import { v4 as uuidv4 } from 'uuid';

export const handleSSEConnection = (req: Request, res: Response) => {
    // Setup headers untuk Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    // Flush headers agar koneksi langsung terbangun
    res.flushHeaders();

    // Ambil userId dari query parameter. Jika tidak ada, gunakan UUID random untuk koneksi guest
    let clientId = req.query.userId as string;
    if (!clientId || clientId === 'undefined' || clientId === 'null') {
        clientId = `guest_${uuidv4()}`;
    }

    // Daftarkan koneksi client ke manager
    sseClient.addClient(clientId, res);

    // Kirim pesan koneksi berhasil (opsional, untuk memastikan stream bekerja)
    res.write(`event: connected\ndata: ${JSON.stringify({ status: 'success', clientId })}\n\n`);

    // Hapus koneksi dari manager saat client memutus koneksi
    req.on('close', () => {
        sseClient.removeClient(clientId, res);
    });
};
