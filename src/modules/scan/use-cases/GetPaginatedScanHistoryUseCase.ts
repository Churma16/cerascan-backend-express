import { IScanRepository } from "../domain/IScanRepository";
import { SequelizeScanRepository } from "../infrastructure/SequelizeScanRepository";
import { getPresignedUrl } from "../../../utils/r2.util";

/**
 * Use case untuk mengambil riwayat scan berhalaman (pagination).
 */
export class GetPaginatedScanHistoryUseCase {
    private scanRepository: IScanRepository;

    /**
     * @param {IScanRepository} [scanRepository=new SequelizeScanRepository()] - Repositori data scan.
     */
    constructor(scanRepository: IScanRepository = new SequelizeScanRepository()) {
        this.scanRepository = scanRepository;
    }

    /**
     * Mengeksekusi pencarian riwayat scan berhalaman.
     *
     * @async
     * @param {number} page - Halaman ke berapa yang diambil.
     * @param {number} limit - Jumlah data per halaman.
     * @param {number|null} [userId] - Filter ID pengguna (opsional, `null` untuk anonim, `undefined` untuk semua).
     * @returns {Promise<{ count: number; rows: any[] }>} Objek berisi jumlah total data dan baris riwayat scan.
     */
    async execute(page: number, limit: number, userId?: number | null) {
        const whereClause: any = {};

        if (userId === null) {
            whereClause.user_id = null;
        } else if (userId !== undefined) {
            whereClause.user_id = userId;
        }

        const { count, rows } = await this.scanRepository.findAndCountAll({
            where: whereClause,
            order: [['createdAt', 'DESC']],
            limit: limit,
            offset: (page - 1) * limit,
        });

        const rowsJson = rows.map((r: any) => r.toJSON());
        for (const scan of rowsJson) {
            if (scan.saved_file_name && scan.saved_file_name.includes('scans-')) {
                scan.file_url = await getPresignedUrl(scan.saved_file_name);
            } else if (scan.saved_file_name) {
                scan.file_url = `${process.env.BACKEND_URL || 'http://localhost:3000'}/uploads/${scan.saved_file_name}`;
            }
        }

        return { count, rows: rowsJson };
    }
}
