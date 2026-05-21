import {DataTypes, Model} from "sequelize";
import sequelize from "../config/database";
import User from "./user.model";

export interface UserOtpAttributes {
    id?: number;
    user_id: number;
    otp: string;
    expired_at: Date;
    is_used?: boolean;
}

class UserOtp extends Model<UserOtpAttributes> implements UserOtpAttributes {
    declare id: number;
    declare user_id: number;
    declare otp: string;
    declare expired_at: Date;
    declare is_used: boolean;

    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
}

UserOtp.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: User,
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        otp: {
            type: DataTypes.STRING(6),
            allowNull: false,
        },
        expired_at: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        is_used: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: 'user_otps',
        timestamps: true,
    }
);

User.hasMany(UserOtp, {foreignKey: 'user_id', as: 'otps'});
UserOtp.belongsTo(User, {foreignKey: 'user_id', as: 'user'});

export default UserOtp;