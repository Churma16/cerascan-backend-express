import { generateId } from "../../../utils/generator";

/**
 * Membuat Scan ID unik dengan format `#SCN-[ID]`.
 *
 * @function generateScanId
 * @returns {string} String ID scan unik terformat.
 */
export const generateScanId = (): string => {
    return `#SCN-${generateId()}`;
};

/**
 * Memformat objek Date menjadi format string `MM/DD`.
 *
 * @function formatScanDate
 * @param {Date} dateObj - Objek tanggal yang akan diformat.
 * @returns {string} Tanggal yang diformat menjadi `MM/DD`.
 */
export const formatScanDate = (dateObj: Date): string => {
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${month}/${day}`;
};
