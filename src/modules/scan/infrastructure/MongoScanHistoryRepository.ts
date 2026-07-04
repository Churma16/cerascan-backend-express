import { AnalyticsModel } from '../../../models/analytics.model';

export interface ScanHistoryPayload {
    scan_id: string;
    user_id: number;
    prediction: string;
    confidence_score: number;
    inference_time: number;
}

export class MongoScanHistoryRepository {
    async create(payload: ScanHistoryPayload): Promise<void> {
        const historyData = new AnalyticsModel({
            scan_id: payload.scan_id,
            user_id: payload.user_id,
            prediction: payload.prediction,
            confidence_score: payload.confidence_score,
            inference_time: payload.inference_time
        });
        
        await historyData.save();
    }
}
