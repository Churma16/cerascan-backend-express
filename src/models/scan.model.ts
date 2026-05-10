import {DataTypes, Model} from 'sequelize';
import sequelize from '../config/database';

// 1. Definisikan bentuk tipe datanya (Interface)
export interface ScanAttributes {
    id?: number;
    scan_id: string;
    file_name: string;
    prediction: string;
    confidence: number;
    inference_time: string;
}

// 2. Buat Class Model
class Scan extends Model<ScanAttributes> implements ScanAttributes {
    declare id: number;
    declare scan_id: string;
    declare file_name: string;
    declare prediction: string;
    declare confidence: number;
    declare inference_time: string;

    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
}

// 3. Inisialisasi struktur tabelnya
Scan.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        scan_id: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        file_name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        prediction: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        confidence: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
        },
        inference_time: {
            type: DataTypes.STRING(20),
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: 'scan_histories',
        timestamps: true, // Otomatis membuat kolom createdAt & updatedAt
    }
);

export default Scan;