import {Sequelize} from 'sequelize';
import dotenv from 'dotenv';
import {log} from '../utils/logger';

dotenv.config();

const sequelize = new Sequelize(
    process.env.DB_NAME || 'ceramic_db',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || '',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: (msg) => log.info('Sequelize', msg),
    }
);

export default sequelize;