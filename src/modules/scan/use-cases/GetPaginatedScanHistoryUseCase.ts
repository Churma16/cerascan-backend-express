import Scan from "../../../models/scan.model";

export class GetPaginatedScanHistoryUseCase {
    async execute(page: number, limit: number, userId?: number | null) {
        const whereClause: any = {};

        if (userId === null) {
            whereClause.user_id = null;
        } else if (userId !== undefined) {
            whereClause.user_id = userId;
        }

        const { count, rows } = await Scan.findAndCountAll({
            where: whereClause,
            order: [['createdAt', 'DESC']],
            limit: limit,
            offset: (page - 1) * limit,
        });

        return { count, rows };
    }
}
