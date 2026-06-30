/**
 * Domain function untuk menghitung sisa hari dari paket.
 */
export const calculateRemainingDays = (endDate: Date, today: Date = new Date()): number => {
    const diffTime = endDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Domain function untuk menghitung nilai sisa (residual value) paket lama.
 */
export const calculateResidualValue = (oldPrice: number, durationDays: number, remainingDays: number): number => {
    if (remainingDays <= 0 || durationDays <= 0) return 0;
    const oldDailyRate = oldPrice / durationDays;
    return Math.floor(remainingDays * oldDailyRate);
};

/**
 * Domain function untuk menghitung harga akhir paket baru setelah dipotong nilai sisa.
 */
export const calculateAdjustedPrice = (newPrice: number, residualValue: number): number => {
    let finalPrice = newPrice - residualValue;
    if (finalPrice < 1000) {
        finalPrice = 1000;
    }
    return finalPrice;
};
