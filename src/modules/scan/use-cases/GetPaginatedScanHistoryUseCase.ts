import { IScanRepository } from "../domain/IScanRepository";
import { SequelizeScanRepository } from "../infrastructure/SequelizeScanRepository";
import { getPresignedUrl } from "../../../utils/r2.util";

export class GetPaginatedScanHistoryUseCase {
    private scanRepository: IScanRepository;

    constructor(scanRepository: IScanRepository = new SequelizeScanRepository()) {
        this.scanRepository = scanRepository;
    }

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
