import { col, fn, literal, Op } from "sequelize";
import { getNowIndonesiaTime } from "../../../utils/time.helper";
import { formatScanDate } from "../domain/scan.domain";
import { IScanRepository } from "../domain/IScanRepository";
import { SequelizeScanRepository } from "../infrastructure/SequelizeScanRepository";

export class GetScanDataCountSinceUseCase {
    private scanRepository: IScanRepository;

    constructor(scanRepository: IScanRepository = new SequelizeScanRepository()) {
        this.scanRepository = scanRepository;
    }

    async execute(limitDays: number = 7, userId?: number, userRole?: string) {
        const now = getNowIndonesiaTime();

        let dbScans: any[] = [];
        try {
            const startDate = new Date(now);
            startDate.setDate(now.getDate() - (limitDays - 1));
            startDate.setHours(0, 0, 0, 0);

            const whereClause: any = {
                createdAt: {
                    [Op.gte]: startDate
                }
            };

            if (userRole && userRole !== 'admin' && userId) {
                whereClause.user_id = userId;
            }

            dbScans = await this.scanRepository.findAll({
                attributes: [
                    [fn('DATE', col('createdAt')), 'date'],
                    [fn('COUNT', col('id')), 'total_scan'],
                    [literal(`SUM(CASE WHEN prediction != 'normal' THEN 1 ELSE 0 END)`), 'defect_count']
                ],
                where: whereClause,
                group: [fn('DATE', col('createdAt'))],
                order: [[fn('DATE', col('createdAt')), 'ASC']],
                raw: true
            });
        } catch (error) {
            console.error("Failed to query scan data trend, using empty list fallback:", error);
            dbScans = [];
        }

        const result: any[] = [];

        for (let i = limitDays - 1; i >= 0; i--) {
            const targetDate = new Date(now);
            targetDate.setDate(now.getDate() - i);
            const dateString = formatScanDate(targetDate);

            const foundData = dbScans.find((scan: any) => {
                if (!scan || !scan.date) return false;
                const parts = String(scan.date).split(/[-/]/);
                if (parts.length >= 3) {
                    let monthStr = "";
                    let dayStr = "";
                    if (parts[0].length === 4) {
                        monthStr = parts[1].padStart(2, '0');
                        dayStr = parts[2].substring(0, 2).padStart(2, '0');
                    } else if (parts[2].length === 4) {
                        monthStr = parts[0].padStart(2, '0');
                        dayStr = parts[1].padStart(2, '0');
                    }
                    if (monthStr && dayStr) {
                        return `${monthStr}/${dayStr}` === dateString;
                    }
                }
                try {
                    return formatScanDate(new Date(scan.date)) === dateString;
                } catch {
                    return false;
                }
            });

            result.push({
                date: dateString,
                total_scan: foundData ? Number(foundData.total_scan) : 0,
                defect_count: foundData ? Number(foundData.defect_count) : 0
            });
        }

        return result;
    }
}
