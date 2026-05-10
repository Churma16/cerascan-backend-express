import {DataTypes, Model} from "sequelize";
import sequelize from "../config/database";

export interface UserAttributes {
    id?: number;
    full_name: string;
    email: string;
    password?: string;
    role: 'admin' | 'operator' | 'user';
}

class User extends Model<UserAttributes> implements UserAttributes {
    public id!: number;
    public full_name!: string;
    public email!: string;
    public password!: string;
    public role!: 'admin' | 'operator' | 'user';

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
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
    },
    {
        sequelize,
        tableName: 'users',
        timestamps: true,
    }
);

export default User;