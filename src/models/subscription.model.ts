import {DataTypes, Model} from "sequelize";
import sequelize from "../config/databaseClient";
import User from "./user.model";
import Plan from "./plan.model";

export interface SubscriptionAttributes {
    id?: number;
    user_id: number;
    plan_id: number;
    status: 'active' | 'expired' | 'canceled';
    acquisition_method: string;
    start_date: Date;
    end_date: Date;
    note?: string;
}

class Subscription extends Model<SubscriptionAttributes> implements SubscriptionAttributes {
    declare id: number;
    declare user_id: number;
    declare plan_id: number;
    declare status: 'active' | 'expired' | 'canceled';
    declare acquisition_method: string;
    declare start_date: Date;
    declare end_date: Date;
    declare note: string;

    declare plan?: Plan;
    declare user?: User;

    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
}

Subscription.init(
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
        status: {
            type: DataTypes.ENUM('active', 'expired', 'canceled'),
            allowNull: false,
            defaultValue: 'active',
        },
        acquisition_method: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'midtrans_payment'
        },
        start_date: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        end_date: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        note: {
            type: DataTypes.STRING,
            allowNull: true,
        }
    },
    {
        sequelize,
        tableName: 'subscriptions',
        timestamps: true,
    }
);

User.hasMany(Subscription, {foreignKey: 'user_id', as: 'subscriptions'});
Subscription.belongsTo(User, {foreignKey: 'user_id', as: 'user'});
Plan.hasMany(Subscription, {foreignKey: 'plan_id', as: 'subscriptions'});
Subscription.belongsTo(Plan, {foreignKey: 'plan_id', as: 'plan'});

export default Subscription;

