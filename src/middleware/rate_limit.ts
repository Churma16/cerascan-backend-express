import rateLimit from 'express-rate-limit';

export const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: {
        status: 'error',
        message: 'Terlalu banyak permintaan OTP. Silakan coba lagi setelah 15 menit.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});