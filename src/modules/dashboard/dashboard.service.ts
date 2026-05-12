import User from "../../models/user.model";
import Scan from "../../models/scan.model";

interface DashboardKPIResult {
    totalScans: number;
    totalUsers: number;
    averageScanAccuracy: number;
    unNormalScanCount: number;
}


export class DashboardService {
    static async getDashboardKPI(): Promise<DashboardKPIResult> {
        const totalScans = await Scan.count();
        const totalUsers = await User.count();

        const avgAccuracy = await Scan.aggregate('confidence', 'avg') || 0;

        const unNormalScanCount = await Scan.count({
            where: {
                prediction: ['crack', 'scratch', 'stain']
            }
        });

        return {
            totalScans,
            totalUsers,
            averageScanAccuracy: Number(avgAccuracy),
            unNormalScanCount
        };
    }
}
