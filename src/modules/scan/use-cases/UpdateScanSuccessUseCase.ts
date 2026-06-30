import { IScanRepository } from "../domain/IScanRepository";
import { SequelizeScanRepository } from "../infrastructure/SequelizeScanRepository";

export class UpdateScanSuccessUseCase {
    private scanRepository: IScanRepository;

    constructor(scanRepository: IScanRepository = new SequelizeScanRepository()) {
        this.scanRepository = scanRepository;
    }

    async execute(dbId: number, prediction: string, confidence: number, inferenceTime: string, userId?: number) {
        await this.scanRepository.update(dbId, {
            prediction,
            confidence,
            inference_time: inferenceTime,
            user_id: userId,
        });
    }
}
