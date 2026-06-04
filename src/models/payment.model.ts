import {DataTypes, Model} from "sequelize";
import sequelize from "../config/database";
import User from "./user.model";
import Plan from "./plan.model";

export interface PaymentAttributes {
    id?: number;
    user_id: number;
    plan_id: number;
    order_id: string;
    transaction_id?: string;
    amount: number;
    payment_type?: string;
    status: 'pending' | 'settlement' | 'expire' | 'deny';

    createdAt?: Date;
    updatedAt?: Date;
}

class Payment extends Model<PaymentAttributes> implements PaymentAttributes {
    declare id: number;
    declare user_id: number;
    declare User: User
    declare plan_id: number;
    declare plan: Plan;
    declare order_id: string;
    declare transaction_id: string;
    declare amount: number;
    declare payment_type: string;
    declare status: 'pending' | 'settlement' | 'expire' | 'deny';

    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
}

Payment.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        plan_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        order_id: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
        },
        transaction_id: {
            type: DataTypes.STRING(100),
            allowNull: true,
            unique: true,
        },
        amount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
        },
        payment_type: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM('pending', 'settlement', 'expire', 'deny'),
            allowNull: false,
            defaultValue: 'pending',
        },
    },
    {
        sequelize,
        tableName: 'payments',
        timestamps: true,
    }
);


export default Payment;

