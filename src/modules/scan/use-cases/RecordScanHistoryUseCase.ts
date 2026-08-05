import { MongoScanHistoryRepository, ScanHistoryPayload } from '../infrastructure/MongoScanHistoryRepository';

/**
 * Use case untuk menyimpan riwayat mentah analitik scan ke MongoDB.
 */
export class RecordScanHistoryUseCase {
    private historyRepository: MongoScanHistoryRepository;

    /**
     * Inisialisasi repositori MongoDB untuk riwayat scan.
     */
    constructor() {
        this.historyRepository = new MongoScanHistoryRepository();
    }

    /**
     * Mengeksekusi pencatatan riwayat analitik ke MongoDB.
     *
     * @async
     * @param {ScanHistoryPayload} payload - Data mentah hasil scan yang akan dicatat.
     * @returns {Promise<void>}
     */
    async execute(payload: ScanHistoryPayload): Promise<void> {
        await this.historyRepository.create(payload);
    }
}
