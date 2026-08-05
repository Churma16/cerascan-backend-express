import { IScanRepository } from "../domain/IScanRepository";
import { SequelizeScanRepository } from "../infrastructure/SequelizeScanRepository";
import { getPresignedUrl } from "../../../utils/r2.util";

/**
 * Use case untuk mengambil daftar riwayat scan terbaru berdasarkan batas tertentu.
 */
export class GetScanHistoryUseCase {
    private scanRepository: IScanRepository;

    /**
     * @param {IScanRepository} [scanRepository=new SequelizeScanRepository()] - Repositori data scan.
     */
    constructor(scanRepository: IScanRepository = new SequelizeScanRepository()) {
        this.scanRepository = scanRepository;
    }

    /**
     * Mengeksekusi pencarian riwayat scan.
     *
     * @async
     * @param {number} limit - Jumlah maksimal data yang akan diambil.
     * @param {number|null} [userId] - Filter ID pengguna (opsional, `null` untuk anonim, `undefined` untuk semua).
     * @returns {Promise<any[]>} Array riwayat scan terformat dengan URL file.
     */
    async execute(limit: number, userId?: number | null) {
        const whereClause: any = {};

        if (userId === null) {
            whereClause.user_id = null;
        } else if (userId !== undefined) {
            whereClause.user_id = userId;
        }

        const scans = await this.scanRepository.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']],
            limit: limit,
        });

        const scansJson = scans.map((s: any) => s.toJSON());
        for (const scan of scansJson) {
            if (scan.saved_file_name && scan.saved_file_name.includes('scans-')) {
                scan.file_url = await getPresignedUrl(scan.saved_file_name);
            } else if (scan.saved_file_name) {
                scan.file_url = `${process.env.BACKEND_URL || 'http://localhost:3000'}/uploads/${scan.saved_file_name}`;
            }
        }

        return scansJson;
    }
}
