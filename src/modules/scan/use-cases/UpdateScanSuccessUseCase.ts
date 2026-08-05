import { IScanRepository } from "../domain/IScanRepository";
import { SequelizeScanRepository } from "../infrastructure/SequelizeScanRepository";

/**
 * Use case untuk memperbarui rekaman scan di database SQL dengan hasil prediksi dan skor kepercayaan dari AI.
 */
export class UpdateScanSuccessUseCase {
    private scanRepository: IScanRepository;

    /**
     * @param {IScanRepository} [scanRepository=new SequelizeScanRepository()] - Repositori data scan.
     */
    constructor(scanRepository: IScanRepository = new SequelizeScanRepository()) {
        this.scanRepository = scanRepository;
    }

    /**
     * Mengeksekusi pembaharuan data hasil scan sukses ke SQL.
     *
     * @async
     * @param {number} dbId - ID entitas scan di database SQL.
     * @param {string} prediction - Hasil klasifikasi prediksi kecacatan.
     * @param {number} confidence - Skor kepercayaan model AI (0.0 - 1.0).
     * @param {string} inferenceTime - Durasi waktu inferensi.
     * @param {number} [userId] - ID pengguna pemilik scan.
     * @returns {Promise<void>}
     */
    async execute(dbId: number, prediction: string, confidence: number, inferenceTime: string, userId?: number): Promise<void> {
        await this.scanRepository.update(dbId, {
            prediction,
            confidence,
            inference_time: inferenceTime,
            user_id: userId,
        });
    }
}
