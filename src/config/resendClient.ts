import {Resend} from 'resend';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.RESEND_API_KEY) {
    console.warn('[Warning] RESEND_API_KEY tidak ditemukan di file .env');
}

export const resend = new Resend(process.env.RESEND_API_KEY);