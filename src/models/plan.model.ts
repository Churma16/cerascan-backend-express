import {DataTypes, Model} from "sequelize";
import sequelize from "../config/databaseClient";

export interface PlanAttributes {
    id?: number;
    name: string;
    price: number;
    scan_quota: number;
    duration_days: number;
}

class Plan extends Model<PlanAttributes> implements PlanAttributes {
    declare id: number;
    declare name: string;
    declare price: number;
    declare scan_quota: number;
    declare duration_days: number;

    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
}

Plan.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
        },
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0,
        },
        scan_quota: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        duration_days: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: 'plans',
        timestamps: true,
    }
);

export default Plan;

