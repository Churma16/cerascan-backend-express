import * as fs from 'node:fs';
import path from 'node:path';
import { IScanRepository } from "../domain/IScanRepository";
import { SequelizeScanRepository } from "../infrastructure/SequelizeScanRepository";

export class DeleteScanUseCase {
    private scanRepository: IScanRepository;

    constructor(scanRepository: IScanRepository = new SequelizeScanRepository()) {
        this.scanRepository = scanRepository;
    }

    async execute(scanId: number) {
        const scan = await this.scanRepository.findById(scanId);

        if (!scan) {
            throw new Error('Data scan tidak ditemukan');
        }

        if (scan.saved_file_name) {
            const uploadsDir = path.join(__dirname, '../../../uploads');
            const filePath = path.join(uploadsDir, scan.saved_file_name);
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch (error: any) {
                console.error('Error deleting file:', error.message);
            }
        }

        await this.scanRepository.destroy(scanId);
        return scan;
    }
}
