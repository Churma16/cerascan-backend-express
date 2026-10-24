import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client } from "../config/r2Client";
import { nanoid } from "nanoid";
import { log } from "../utils/logger";

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "vgg-storage";

export class StorageService {
    async uploadFile(
        fileBuffer: Buffer,
        mimeType: string,
        folder: string = ""
    ): Promise<string> {
        try {
            const fileExtension = mimeType.split("/")[1] || "bin";
            const uniqueFileName = `${folder}${nanoid()}.${fileExtension}`;

            const putCommand = new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: uniqueFileName,
                Body: fileBuffer,
                ContentType: mimeType
            });

            await r2Client.send(putCommand);
            log.info("StorageService", `File berhasil diunggah ke storage: ${uniqueFileName}`);

            return uniqueFileName;
        } catch (uploadError) {
            const errorMessage = uploadError instanceof Error ? uploadError.message : String(uploadError);
            log.error("StorageService", `Gagal mengunggah file ke storage: ${errorMessage}`);
            throw new Error("Gagal mengunggah file ke storage");
        }
    }

    async downloadFile(objectKey: string): Promise<Buffer> {
        try {
            const getCommand = new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: objectKey
            });
            const response = await r2Client.send(getCommand);

            if (!response.Body) {
                throw new Error("File tidak ditemukan di storage");
            }

            const byteArray = await response.Body.transformToByteArray();
            return Buffer.from(byteArray);
        } catch (downloadError) {
            const errorMessage = downloadError instanceof Error ? downloadError.message : String(downloadError);
            log.error("StorageService", `Gagal mengunduh file ${objectKey} dari storage: ${errorMessage}`);
            throw new Error("Gagal mengunduh file dari storage");
        }
    }

    async getPresignedUrl(objectKey: string, expiresIn: number = 3600): Promise<string> {
        try {
            const getCommand = new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: objectKey
            });

            return await getSignedUrl(r2Client, getCommand, { expiresIn });
        } catch (presignError) {
            const errorMessage = presignError instanceof Error ? presignError.message : String(presignError);
            log.error("StorageService", `Gagal membuat presigned URL untuk: ${objectKey}: ${errorMessage}`);
            throw new Error("Gagal membuat presigned access URL");
        }
    }

    async deleteFile(objectKey: string): Promise<void> {
        try {
            const deleteCommand = new DeleteObjectCommand({
                Bucket: BUCKET_NAME,
                Key: objectKey
            });
            await r2Client.send(deleteCommand);
            log.info("StorageService", `File berhasil dihapus dari storage: ${objectKey}`);
        } catch (deleteError) {
            const errorMessage = deleteError instanceof Error ? deleteError.message : String(deleteError);
            log.error("StorageService", `Gagal menghapus file ${objectKey} dari storage: ${errorMessage}`);
            throw new Error("Gagal menghapus file dari storage");
        }
    }
}

export const storageService = new StorageService();

// Standalone functions for functional import style
export const uploadFileToR2 = (fileBuffer: Buffer, mimeType: string, folder: string = "") =>
    storageService.uploadFile(fileBuffer, mimeType, folder);

export const downloadFileFromR2 = (objectKey: string) =>
    storageService.downloadFile(objectKey);

export const deleteFileFromR2 = (objectKey: string) =>
    storageService.deleteFile(objectKey);

export const getPresignedUrl = (objectKey: string, expiresIn: number = 3600) =>
    storageService.getPresignedUrl(objectKey, expiresIn);
