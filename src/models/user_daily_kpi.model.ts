// File: src/models/user_daily_kpi.model.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IUserDailyKpiDocument extends Document {
    user_id: number;
    date: string;
    total_scans: number;
    normal_scans: number;
    defect_scans: number;
    total_confidence: number;
    created_at: Date;
    updated_at: Date;
}

const UserDailyKpiSchema: Schema = new Schema({
    // user_id bisa bernilai null/0 jika discan oleh guest (tidak login)
    user_id: { type: Number, required: false, default: 0 },

    // date bertipe string untuk mempermudah pencarian unik harian
    date: { type: String, required: true },

    total_scans: { type: Number, required: true, default: 0 },
    normal_scans: { type: Number, required: true, default: 0 },
    defect_scans: { type: Number, required: true, default: 0 },

    // total_confidence menampung penjumlahan skor confidence (misal: 98.5 + 97.2 + ...)
    total_confidence: { type: Number, required: true, default: 0 },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});


UserDailyKpiSchema.index({ user_id: 1, date: 1 }, { unique: true });

export const UserDailyKpiModel = mongoose.model<IUserDailyKpiDocument>(
    'UserDailyKpi',
    UserDailyKpiSchema,
    'user_daily_kpis' // Nama collection di MongoDB Compass
);