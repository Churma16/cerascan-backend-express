import {DataTypes, Model} from "sequelize";
import sequelize from "../config/databaseClient";
import User from "./user.model";

export interface LeaderboardArchiveAttributes {
    id?: number;
    user_id: number;
    period: string;
    total_scans: number;
    defect_scans: number;
}

class LeaderboardArchive extends Model<LeaderboardArchiveAttributes> implements LeaderboardArchiveAttributes {
    declare id: number;
    declare user_id: number;
    declare user: User;
    declare period: string;
    declare total_scans: number;
    declare defect_scans: number;

    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
}

LeaderboardArchive.init(
    {
        id: {type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true},
        user_id: {type: DataTypes.INTEGER, allowNull: false},
        period: {type: DataTypes.STRING(7), allowNull: false},
        total_scans: {type: DataTypes.INTEGER, allowNull: false, defaultValue: 0},
        defect_scans: {type: DataTypes.INTEGER, allowNull: false, defaultValue: 0}, // --- KOLOM BARU ---
    },
    {sequelize, tableName: "leaderboard_archives", timestamps: true}
);

export default LeaderboardArchive;