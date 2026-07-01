import mongoose, {Document, Schema} from 'mongoose';

export interface IAnalyticsDocument extends Document {
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

export const AnalyticsModel = mongoose.model<IAnalyticsDocument>('Analytics', AnalyticsSchema, 'scan_analytics');