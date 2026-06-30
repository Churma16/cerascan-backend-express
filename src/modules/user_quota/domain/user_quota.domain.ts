/**
 * Domain function untuk memvalidasi apakah kuota mencukupi.
 */
export const hasSufficientQuota = (remainingQuota: number, requestedAmount: number): boolean => {
    return remainingQuota >= requestedAmount;
};

/**
 * Domain function untuk menghitung kuota terpakai dari total dan sisa kuota.
 */
export const calculateUsedQuota = (totalQuota: number, remainingQuota: number): number => {
    const used = totalQuota - remainingQuota;
    return used >= 0 ? used : 0;
};
