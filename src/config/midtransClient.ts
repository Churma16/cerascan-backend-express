import midtransClient from 'midtrans-client';

export const snap = new midtransClient.Snap({
    isProduction: process.env.NODE_ENV === 'production' || process.env.MIDTRANS_IS_PRODUCTION === 'true',
    serverKey: process.env.MIDTRANS_SERVER_KEY || 'YOUR_SERVER_KEY',
    clientKey: process.env.MIDTRANS_CLIENT_KEY || 'YOUR_CLIENT_KEY'
});
