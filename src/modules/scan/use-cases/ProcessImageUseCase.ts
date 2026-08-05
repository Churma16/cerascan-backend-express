import { RabbitmqPublisher } from "../../../transport/rabbitmq/infrastructure/rabbitmq.publisher";
import { generateScanId } from "../domain/scan.domain";
import { IScanRepository } from "../domain/IScanRepository";
import { SequelizeScanRepository } from "../infrastructure/SequelizeScanRepository";

/**
 * Use case untuk memulai alur pemrosesan gambar scan baru.
 * Membuat entitas rekaman di SQL dengan status 'processing' dan menerbitkan event 'scan.process' ke Message Broker.
 */
export class ProcessImageUseCase {
    private scanRepository: IScanRepository;

    /**
     * @param {IScanRepository} [scanRepository=new SequelizeScanRepository()] - Repositori data scan.
     */
    constructor(scanRepository: IScanRepository = new SequelizeScanRepository()) {
        this.scanRepository = scanRepository;
    }

    /**
     * Mengeksekusi registrasi scan baru dan melempar tugas ke antrean pemrosesan AI.
     *
     * @async
     * @param {number|undefined} userId - ID pengguna yang melakukan scan (opsional untuk guest).
     * @param {string} r2ObjectKey - Key/path objek gambar di Cloudflare R2 storage.
     * @param {string} originalName - Nama asli file gambar yang diunggah.
     * @param {string} savedFileName - Nama simpan file.
     * @returns {Promise<any>} Entitas Scan baru yang berhasil dibuat.
     */
    async execute(userId: number | undefined, r2ObjectKey: string, originalName: string, savedFileName: string) {
        const scanId = generateScanId();
        const newScan = await this.scanRepository.create({
            scan_id: scanId,
            file_name: originalName,
            saved_file_name: r2ObjectKey,
            prediction: 'processing',
            confidence: 0,
            inference_time: '0ms',
            user_id: userId,
        });

        await RabbitmqPublisher.publishEvent('scan.process', {
            db_id: newScan.id,
            user_id: userId,
            scan_id: scanId,
            r2_object_key: r2ObjectKey,
            original_name: originalName
        });

        return newScan;
    }
}
