import * as fs from 'node:fs';
import path from 'node:path';
import { deleteFileFromR2 } from "../../../utils/r2.util";
import { IScanRepository } from "../domain/IScanRepository";
import { SequelizeScanRepository } from "../infrastructure/SequelizeScanRepository";

/**
 * Use case untuk menghapus data scan beserta file gambar terkait (di R2 cloud storage atau penyimpanan lokal).
 */
export class DeleteScanUseCase {
    private scanRepository: IScanRepository;

    /**
     * @param {IScanRepository} [scanRepository=new SequelizeScanRepository()] - Repositori data scan.
     */
    constructor(scanRepository: IScanRepository = new SequelizeScanRepository()) {
        this.scanRepository = scanRepository;
    }

    /**
     * Mengeksekusi penghapusan scan berdasarkan ID utama.
     *
     * @async
     * @param {number} scanId - ID utama scan di database.
     * @returns {Promise<any>} Entitas Scan yang telah dihapus.
     * @throws {Error} Jika data scan tidak ditemukan.
     */
    async execute(scanId: number) {
        const scan = await this.scanRepository.findById(scanId);

        if (!scan) {
            throw new Error('Data scan tidak ditemukan');
        }

        if (scan.saved_file_name) {
            if (scan.saved_file_name.includes('scans-')) {
                try {
                    await deleteFileFromR2(scan.saved_file_name);
                } catch (error: any) {
                    console.error('Error deleting file from R2:', error.message);
                }
            } else {
                const uploadsDir = path.join(__dirname, '../../../uploads');
                const filePath = path.join(uploadsDir, scan.saved_file_name);
                try {
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                } catch (error: any) {
                    console.error('Error deleting local file:', error.message);
                }
            }
        }

        await this.scanRepository.destroy(scanId);
        return scan;
    }
}
