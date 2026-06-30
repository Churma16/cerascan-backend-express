import Scan from "../../../models/scan.model";

export class GetScanHistoryUseCase {
    async execute(limit: number, userId?: number | null) {
        const whereClause: any = {};

        if (userId === null) {
            whereClause.user_id = null;
        } else if (userId !== undefined) {
            whereClause.user_id = userId;
        }

        const scans = await Scan.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']],
            limit: limit,
        });

        return scans;
    }
}
