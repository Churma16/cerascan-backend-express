import { generateId } from "../../../utils/generator";

/**
 * Domain function untuk membuat Scan ID dengan format spesifik.
 */
export const generateScanId = (): string => {
    return `#SCN-${generateId()}`;
};

/**
 * Domain function untuk memformat Date objek menjadi format MM/DD.
 */
export const formatScanDate = (dateObj: Date): string => {
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${month}/${day}`;
};
