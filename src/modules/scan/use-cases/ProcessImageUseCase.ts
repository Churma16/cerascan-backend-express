import { RabbitMQClient } from "../../rabbitmq/infrastructure/rabbitmq.client";
import { generateScanId } from "../domain/scan.domain";
import { IScanRepository } from "../domain/IScanRepository";
import { SequelizeScanRepository } from "../infrastructure/SequelizeScanRepository";

export class ProcessImageUseCase {
    private scanRepository: IScanRepository;

    constructor(scanRepository: IScanRepository = new SequelizeScanRepository()) {
        this.scanRepository = scanRepository;
    }

    async execute(userId: number | undefined, filePath: string, originalName: string, savedFileName: string) {
        const scanId = generateScanId();
        const newScan = await this.scanRepository.create({
            scan_id: scanId,
            file_name: originalName,
            saved_file_name: savedFileName,
            prediction: 'processing',
            confidence: 0,
            inference_time: '0ms',
            user_id: userId,
        });

        await RabbitMQClient.publishEvent('scan.process', {
            db_id: newScan.id,
            user_id: userId,
            scan_id: scanId,
            file_path: filePath,
            original_name: originalName
        });

        return newScan;
    }
}
