import { DataTypes, Model } from "sequelize";
import sequelize from "../config/databaseClient";

export interface UserQuotaAttributes {
    id?: number;
    user_id: number;
    total_quota: number;
    used_quota: number;
    next_reset_date?: Date;
}

class UserQuotaModel extends Model<UserQuotaAttributes> implements UserQuotaAttributes {
    declare id: number;
    declare user_id: number;
    declare total_quota: number;
    declare used_quota: number;
    declare next_reset_date: Date;

    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
}

UserQuotaModel.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
        },
        total_quota: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        used_quota: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        next_reset_date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'user_quotas',
        timestamps: true,
    }
);

export default UserQuotaModel;
