import { S3Client } from '@aws-sdk/client-s3';
import { log } from '../utils/logger';
import dotenv from 'dotenv';

dotenv.config();

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_SPECIFIC_ENDPOINT = process.env.R2_SPECIFIC_ENDPOINT || '';

if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_SPECIFIC_ENDPOINT) {
  log.warn('R2 Client', 'R2 credentials are not fully configured in .env');
}

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_SPECIFIC_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});
