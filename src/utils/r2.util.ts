import {GetObjectCommand, PutObjectCommand, DeleteObjectCommand} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
import {r2Client} from '../config/r2Client';
import {nanoid} from 'nanoid';
import {log} from "../utils/logger";

const BUCKET_NAME = 'vgg-storage';

/**
 * Uploads a file buffer to Cloudflare R2
 * @param fileBuffer The file buffer to upload
 * @param mimeType The mime type of the file (e.g., 'image/jpeg')
 * @param folder Optional folder path within the bucket (e.g., 'scans/')
 * @returns The generated key (filename) of the uploaded object
 */
export const uploadFileToR2 = async (
    fileBuffer: Buffer,
    mimeType: string,
    folder: string = ''
): Promise<string> => {
    try {
        const fileExtension = mimeType.split('/')[1] || 'bin';
        const uniqueFileName = `${folder}${nanoid()}.${fileExtension}`;

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: uniqueFileName,
            Body: fileBuffer,
            ContentType: mimeType,
        });

        await r2Client.send(command);
        log.info('R2 Util', `Successfully uploaded file to R2: ${uniqueFileName}`);

        return uniqueFileName;
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log.error('R2 Util', `Failed to upload file to R2: ${errorMsg}`);
        throw new Error('Failed to upload file to storage');
    }
};

/**
 * Generates a presigned URL to securely view/download an object from R2
 * @param objectKey The key (filename) of the object in R2
 * @param expiresIn Time in seconds until the URL expires (default 1 hour)
 * @returns A temporary URL to access the file
 */
export const getPresignedUrl = async (
    objectKey: string,
    expiresIn: number = 3600
): Promise<string> => {
    try {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: objectKey,
        });

        const url = await getSignedUrl(r2Client, command, {expiresIn});
        return url;
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log.error('R2 Util', `Failed to generate presigned URL for R2 object: ${errorMsg}`);
        throw new Error('Failed to generate access URL');
    }
};

/**
 * Downloads a file from Cloudflare R2 and returns it as a Buffer
 */
export const downloadFileFromR2 = async (objectKey: string): Promise<Buffer> => {
    try {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: objectKey,
        });
        const response = await r2Client.send(command);

        if (!response.Body) {
            throw new Error('File tidak ditemukan di R2');
        }

        const byteArray = await response.Body.transformToByteArray();
        return Buffer.from(byteArray);
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log.error('R2 Util', `Gagal mengunduh file ${objectKey} dari R2: ${errorMsg}`);
        throw new Error('Gagal mengunduh file dari storage');
    }
};

/**
 * Deletes a file from Cloudflare R2
 */
export const deleteFileFromR2 = async (objectKey: string): Promise<void> => {
    try {
        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: objectKey,
        });
        await r2Client.send(command);
        log.info('R2 Util', `Successfully deleted file from R2: ${objectKey}`);
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log.error('R2 Util', `Failed to delete file ${objectKey} from R2: ${errorMsg}`);
        throw new Error('Gagal menghapus file dari storage');
    }
};
