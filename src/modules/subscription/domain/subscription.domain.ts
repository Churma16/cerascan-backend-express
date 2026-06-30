/**
 * Domain function untuk memformat dan menghitung sisa waktu durasi langganan.
 */
export const getRemainingDurationString = (planId: number, endDate: Date, now: Date = new Date()): string => {
    if (planId === 1) {
        return 'Selamanya';
    }
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? `${diffDays} Hari` : '0 Hari';
};
