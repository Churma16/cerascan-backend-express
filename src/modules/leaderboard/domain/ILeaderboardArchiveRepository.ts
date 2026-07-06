import { Transaction } from "sequelize";
import LeaderboardArchive, { LeaderboardArchiveAttributes } from "../../../models/leaderboardArchive";

export interface ILeaderboardArchiveRepository {
    bulkUpsert(records: Partial<LeaderboardArchiveAttributes>[], transaction?: Transaction): Promise<LeaderboardArchive[]>;
}
