import { MongoScanHistoryRepository, ScanHistoryPayload } from '../infrastructure/MongoScanHistoryRepository';

export class RecordScanHistoryUseCase {
    private historyRepository: MongoScanHistoryRepository;

    constructor() {
        this.historyRepository = new MongoScanHistoryRepository();
    }

    async execute(payload: ScanHistoryPayload): Promise<void> {
        await this.historyRepository.create(payload);
    }
}
