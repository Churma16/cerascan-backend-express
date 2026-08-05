import { IScanRepository } from "../domain/IScanRepository";
import { SequelizeScanRepository } from "../infrastructure/SequelizeScanRepository";

/**
 * Use case untuk memperbarui status rekaman scan di SQL menjadi 'failed' ketika terjadi kegagalan inferensi AI.
 */
export class UpdateScanFailedUseCase {
    private scanRepository: IScanRepository;

    /**
     * @param {IScanRepository} [scanRepository=new SequelizeScanRepository()] - Repositori data scan.
     */
    constructor(scanRepository: IScanRepository = new SequelizeScanRepository()) {
        this.scanRepository = scanRepository;
    }

    /**
     * Mengeksekusi penandaan status scan gagal di SQL.
     *
     * @async
     * @param {number} dbId - ID rekaman scan di database SQL.
     * @returns {Promise<void>}
     */
    async execute(dbId: number): Promise<void> {
        await this.scanRepository.update(dbId, {
            prediction: 'failed',
        });
    }
}
