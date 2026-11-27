import {Sequelize} from 'sequelize';
import dotenv from 'dotenv';
import { log } from '../utils/logger.util';

dotenv.config();

const sequelize = new Sequelize(
    process.env.DB_NAME || 'ceramic_db',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || '',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: (msg) => log.info('Sequelize', msg),
        pool: {
            max: Number(process.env.DB_POOL_MAX) || 20,
            min: 2,
            acquire: 30000,
            idle: 10000
        }
    }
);

export default sequelize;