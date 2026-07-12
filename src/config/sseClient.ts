import { Response } from 'express';
import { log } from '../utils/logger';

class SSEClientManager {
    // Map menyimpan array Response untuk setiap userId/clientId
    // Hal ini memungkinkan satu user membuka beberapa tab sekaligus
    private clients = new Map<string, Response[]>();

    public addClient(id: string, res: Response) {
        if (!this.clients.has(id)) {
            this.clients.set(id, []);
        }
        this.clients.get(id)!.push(res);
        log.info('SSE', `Client terhubung: ${id} (Total koneksi untuk ID ini: ${this.clients.get(id)!.length})`);
    }

    public removeClient(id: string, res: Response) {
        const userClients = this.clients.get(id);
        if (userClients) {
            const index = userClients.indexOf(res);
            if (index !== -1) {
                userClients.splice(index, 1);
            }
            // Hapus key jika sudah tidak ada koneksi untuk user tersebut
            if (userClients.length === 0) {
                this.clients.delete(id);
            }
            log.info('SSE', `Client terputus: ${id} (Sisa koneksi untuk ID ini: ${this.clients.get(id)?.length || 0})`);
        }
    }

    public broadcast(event: string, data: any) {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        this.clients.forEach((userClients) => {
            userClients.forEach(res => res.write(payload));
        });
    }

    public emitToUser(userId: string, event: string, data: any) {
        const userClients = this.clients.get(userId);
        if (userClients && userClients.length > 0) {
            const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
            userClients.forEach(res => res.write(payload));
        }
    }
}

export const sseClient = new SSEClientManager();
