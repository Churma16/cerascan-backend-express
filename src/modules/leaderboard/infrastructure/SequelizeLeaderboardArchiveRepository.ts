import { Transaction } from "sequelize";
import LeaderboardArchive, { LeaderboardArchiveAttributes } from '../../../models/leaderboardArchive.model';
import { ILeaderboardArchiveRepository } from "../domain/ILeaderboardArchiveRepository";

export class SequelizeLeaderboardArchiveRepository implements ILeaderboardArchiveRepository {
    async bulkUpsert(records: Partial<LeaderboardArchiveAttributes>[], transaction?: Transaction): Promise<LeaderboardArchive[]> {
        return await LeaderboardArchive.bulkCreate(records as any[], {
            updateOnDuplicate: ['total_scans', 'defect_scans', 'updatedAt'] as any[],
            transaction
        });
    }
}
