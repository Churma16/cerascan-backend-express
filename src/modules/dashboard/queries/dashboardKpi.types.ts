export interface DashboardKpiResponseDto {
    total_scans: number;
    total_users: number;
    average_scan_accuracy: number;
    unnormal_scan_count: number;
    total_scans_this_month: number;
    scan_change_text: string;
    defect_rate: number;
    defect_count_this_month: number;
    active_users_this_month: number;
    user_quota: {
        total_quota: number;
        used_quota: number;
        remaining_quota: number;
        is_quota_low: boolean;
        next_reset_date: string | Date | null;
    } | null;
    active_subscription: {
        plan_name: string;
        status: string;
        end_date: string | Date | null;
    } | null;
}

export function calculateTrendPercentageText(totalScansLastMonth: number, totalScansThisMonth: number): string {
    if (totalScansLastMonth > 0) {
        const differenceCount = totalScansThisMonth - totalScansLastMonth;
        const percentageValue = Math.round((differenceCount / totalScansLastMonth) * 100);
        if (percentageValue > 0) {
            return `Naik ${percentageValue}% dari bulan lalu`;
        }
        if (percentageValue < 0) {
            return `Turun ${Math.abs(percentageValue)}% dari bulan lalu`;
        }
        return "Stabil dari bulan lalu";
    }
    if (totalScansThisMonth > 0) {
        return "Naik 100% dari bulan lalu";
    }
    return "Stabil dari bulan lalu";
}
