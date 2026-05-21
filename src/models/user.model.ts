import {DataTypes, Model} from "sequelize";
import sequelize from "../config/database";

export interface UserAttributes {
    id?: number;
    full_name: string;
    email: string;
    password?: string;
    role: 'admin' | 'operator' | 'user';
    verified_at?: Date;
}

class User extends Model<UserAttributes> implements UserAttributes {
    declare id: number;
    declare full_name: string;
    declare email: string;
    declare password: string;
    declare role: 'admin' | 'operator' | 'user';
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
            validate: {
                isEmail: true,
            }
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        role: {
            type: DataTypes.ENUM('admin', 'operator', 'user'),
            defaultValue: 'user',
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