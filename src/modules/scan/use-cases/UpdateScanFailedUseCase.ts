import Scan from "../../../models/scan.model";

export class UpdateScanFailedUseCase {
    async execute(dbId: number) {
        await Scan.update({
            prediction: 'failed',
        }, {
            where: { id: dbId }
        });
    }
}
