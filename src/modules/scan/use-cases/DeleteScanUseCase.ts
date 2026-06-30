import * as fs from 'node:fs';
import path from 'node:path';
import Scan from "../../../models/scan.model";

export class DeleteScanUseCase {
    async execute(scanId: number) {
        const scan = await Scan.findOne({
            where: { id: scanId },
        });

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

        await scan.destroy();
        return scan;
    }
}
