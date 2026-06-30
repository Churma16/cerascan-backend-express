import Scan from "../../../models/scan.model";
import { RabbitMQClient } from "../../rabbitmq/infrastructure/rabbitmq.client";
import { generateScanId } from "../domain/scan.domain";

export class ProcessImageUseCase {
    async execute(userId: number | undefined, filePath: string, originalName: string, savedFileName: string) {
        const scanId = generateScanId();
        const newScan = await Scan.create({
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
