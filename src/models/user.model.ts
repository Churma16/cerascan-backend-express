import {DataTypes, Model} from "sequelize";
import sequelize from "../config/databaseClient";
import Plan from "./plan.model";
import UserQuotaModel from "./userQuota.model";

export interface UserAttributes {
    id?: number;
    full_name: string;
    email: string;
    password?: string;
    googleId?: string | null;
    avatar?: string | null; // Google Account Avatar
    role: 'admin' | 'operator' | 'user';
    sub_tier: 'free' | 'paid';
    plan_id: number;
    plan?: Plan;
    user_quota?: UserQuotaModel;
    verified_at?: Date;
}

class User extends Model<UserAttributes> implements UserAttributes {
    declare id: number;
    declare full_name: string;
    declare email: string;
    declare password?: string;
    declare googleId?: string;
    declare avatar?: string;
    declare role: 'admin' | 'operator' | 'user';
    declare sub_tier: 'free' | 'paid';
    declare plan_id: number;
    declare plan: Plan;
    declare user_quota: UserQuotaModel;
    declare verified_at: Date;

    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
}

User.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        full_name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        password: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        googleId: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true,
        },
        avatar: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        role: {
            type: DataTypes.ENUM('admin', 'operator', 'user'),
            defaultValue: 'user',
            allowNull: false,
        },
        sub_tier: {
            type: DataTypes.ENUM('free', 'paid'),
            defaultValue: 'free',
            allowNull: false,
        },
        plan_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        verified_at: {
            type: DataTypes.DATE,
            allowNull: true,
        }
    },
    {
        sequelize,
        tableName: 'users',
        timestamps: true,
    }
);

export default User;