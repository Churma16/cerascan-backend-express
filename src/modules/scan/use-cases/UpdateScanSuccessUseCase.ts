import Scan from "../../../models/scan.model";

export class UpdateScanSuccessUseCase {
    async execute(dbId: number, prediction: string, confidence: number, inferenceTime: string, userId?: number) {
        await Scan.update({
            prediction,
            confidence,
            inference_time: inferenceTime,
            user_id: userId,
        }, {
            where: { id: dbId }
        });
    }
}
