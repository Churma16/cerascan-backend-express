/**
 * Domain function untuk menghitung rasio cacat dibanding total scan.
 */
export const calculateDefectRatio = (totalScans: number, defectScans: number): number => {
    return totalScans > 0 ? (defectScans / totalScans) : 0;
};
