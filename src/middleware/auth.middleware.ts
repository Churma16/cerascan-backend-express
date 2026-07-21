import {NextFunction, Request, Response} from 'express';
import jwt from 'jsonwebtoken';
import {sendResponse} from '../utils/response';

const SECRET_KEY = process.env.JWT_SECRET || 'fallback_secret_key';

declare global {
    namespace Express {
        interface User {
            id: number;
            role: string;
            plan_id: number;
        }
    }
}

export interface AuthRequest extends Request {
}

// Check Login
export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return sendResponse(res, 401, "Akses ditolak. Token kredensial tidak ditemukan.");
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, SECRET_KEY) as { id: number; role: string, plan_id: number };
        req.user = decoded;
        next();
    } catch (error) {
        return sendResponse(res, 401, "Sesi Anda telah kedaluwarsa atau token tidak valid.");
    }
};

// Check Role
export const requireRole = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return sendResponse(res, 403, "Akses ditolak. Anda tidak memiliki izin (bukan admin).");
        }
        next();
    };
};