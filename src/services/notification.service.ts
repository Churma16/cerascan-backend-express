import { getSocket } from "../config/websocketClient";
import { sseClient } from "../config/sseClient";
import { parseOrderId } from "../utils/order.helper";

export interface ScanCompletedData {
    db_id: number;
    scan_id: string;
    prediction: string;
    confidence: number;
    inference_time: string;
}

export interface ScanFailedData {
    db_id: number;
    scan_id: string;
    error_message?: string;
    error?: string;
}

export interface PaymentSuccessData {
    orderId: string;
    transactionId?: string;
    amount?: string;
    payment_type?: string;
    status: string;
    timestamp: string;
}

export interface PaymentFailedData {
    orderId: string;
    transactionId?: string;
    amount?: string;
    payment_type?: string;
    status: string;
    timestamp: string;
    error_message?: string;
}

export class NotificationService {
    static async emitScanCompleted(data: ScanCompletedData) {
        const io = getSocket();
        io.emit('scan_completed', data);
        sseClient.broadcast('scan_completed', data);
    }

    static async emitScanFailed(data: ScanFailedData) {
        const io = getSocket();
        io.emit('scan_failed', data);
        sseClient.broadcast('scan_failed', data);
    }

    static async emitPaymentSuccess(data: PaymentSuccessData) {
        try {
            const { userId } = parseOrderId(data.orderId);
            sseClient.emitToUser(userId.toString(), 'payment_success', data);
            sseClient.broadcast(`payment_success_${data.orderId}`, data);
            console.log(`[SSE] Event payment_success dipancarkan untuk order: ${data.orderId}`);
        } catch (error) {
            console.error('[SSE] Gagal memancarkan event payment_success:', error);
        }
    }

    static async emitPaymentFailed(data: PaymentFailedData) {
        try {
            const { userId } = parseOrderId(data.orderId);
            sseClient.emitToUser(userId.toString(), 'payment_failed', data);
            sseClient.broadcast(`payment_failed_${data.orderId}`, data);
            console.log(`[SSE] Event payment_failed dipancarkan untuk order: ${data.orderId}`);
        } catch (error) {
            console.error('[SSE] Gagal memancarkan event payment_failed:', error);
        }
    }

    static async emitDlqUpdated(payload?: any) {
        try {
            sseClient.broadcast('dlq_updated', payload || { timestamp: new Date() });
            console.log('[SSE] Event dlq_updated dipancarkan.');
        } catch (error) {
            console.error('[SSE] Gagal memancarkan event dlq_updated:', error);
        }
    }
}
