import mongoose, {Document, Schema} from 'mongoose';

export interface IScanAnalyticsDocument extends Document {
    scan_id: string;
    user_id?: number;
    prediction: string;
    confidence_score: number;
    inference_time: string;
    created_at: Date;
}

const AnalyticsSchema: Schema = new Schema({
    scan_id: {type: String, required: true},
    user_id: {type: Number, required: false},
    prediction: {type: String, required: true},
    confidence_score: {type: Number, required: true},
    inference_time: {type: String, required: true},
    created_at: {type: Date, default: Date.now}
});

AnalyticsSchema.index({ user_id: 1, created_at: -1 });


export const ScanAnalyticsModel = mongoose.model<IScanAnalyticsDocument>('Analytics', AnalyticsSchema, 'scan_analytics');

export type IAnalyticsDocument = IScanAnalyticsDocument;
export const AnalyticsModel = ScanAnalyticsModel;