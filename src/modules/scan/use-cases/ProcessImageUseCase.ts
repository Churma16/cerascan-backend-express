import { RabbitmqPublisher } from "../../rabbitmq/infrastructure/rabbitmq.publisher";
import { generateScanId } from "../domain/scan.domain";
import { IScanRepository } from "../domain/IScanRepository";
import { SequelizeScanRepository } from "../infrastructure/SequelizeScanRepository";

export class ProcessImageUseCase {
    private scanRepository: IScanRepository;
    constructor(scanRepository: IScanRepository = new SequelizeScanRepository()) {
        this.scanRepository = scanRepository;
    }
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
