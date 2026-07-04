export interface AnalyticsPayload {
    db_id: number;
    scan_id: string;
    user_id?: number;
    prediction: string;
    confidence_score: number;
    inference_time: string;
}

export interface IAnalyticsPublisher {
    connect(): Promise<void>;

    publish(data: AnalyticsPayload): Promise<void>;

    disconnect(): Promise<void>;
}