import { analyticsService } from "../../services/analytics.service";

export class DashboardService {
    static async getDashboardKPI(userId?: number, userRole?: string) {
        return await analyticsService.getDashboardKPI(userId, userRole);
    }
}
