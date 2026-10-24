import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/databaseClient';

export interface DeadLetterMessageAttributes {
    id?: number;
    message_id: string;
    routing_key: string;
    queue_name: string;
    user_id?: number | null;
    payload: Record<string, any>;
    error_message?: string | null;
    retry_count?: number;
    status?: 'dead' | 'retried' | 'purged';
    createdAt?: Date;
    updatedAt?: Date;
}

class DeadLetterMessage extends Model<DeadLetterMessageAttributes> implements DeadLetterMessageAttributes {
    declare id: number;
    declare message_id: string;
    declare routing_key: string;
    declare queue_name: string;
    declare user_id: number | null;
    declare payload: Record<string, any>;
    declare error_message: string | null;
    declare retry_count: number;
    declare status: 'dead' | 'retried' | 'purged';

    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
}

DeadLetterMessage.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        message_id: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        routing_key: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        queue_name: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        payload: {
            type: DataTypes.JSON,
            allowNull: false,
        },
        error_message: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        retry_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        status: {
            type: DataTypes.ENUM('dead', 'retried', 'purged'),
            allowNull: false,
            defaultValue: 'dead',
        },
    },
    {
        sequelize,
        tableName: 'dead_letter_messages',
        timestamps: true,
        indexes: [
            {
                fields: ['message_id'],
            },
            {
                fields: ['status'],
            },
            {
                fields: ['user_id'],
            },
        ],
    }
);

export default DeadLetterMessage;
