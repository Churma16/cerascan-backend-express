import { Transaction } from "sequelize";
import LeaderboardArchive, { LeaderboardArchiveAttributes } from "../../../models/leaderboard_archive.model";

export interface ILeaderboardArchiveRepository {
    bulkUpsert(records: Partial<LeaderboardArchiveAttributes>[], transaction?: Transaction): Promise<LeaderboardArchive[]>;
}
