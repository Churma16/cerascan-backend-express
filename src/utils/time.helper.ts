/**
 * Get current time in Indonesia timezone (UTC+7)
 * @returns {Date} Current date and time in Indonesia timezone
 */
export function getNowIndonesiaTime(): Date {
    return new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Jakarta'}));
}

/**
 * Get start of day (00:00:00) in Indonesia timezone (UTC+7)
 * @returns {Date} Start of day in Indonesia timezone
 */
export function getStartOfDayIndonesiaTime(): Date {
    const now = new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Jakarta'}));
    now.setHours(0, 0, 0, 0);
    return now;
}

/**
 * Get end of day (23:59:59) in Indonesia timezone (UTC+7)
 * @returns {Date} End of day in Indonesia timezone
 */
export function getEndOfDayIndonesiaTime(): Date {
    const now = new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Jakarta'}));
    now.setHours(23, 59, 59, 999);
    return now;
}

/**
 * Convert any date to Indonesia timezone
 * @param {Date} date - Date to convert
 * @returns {Date} Converted date in Indonesia timezone
 */
export function convertToIndonesiaTime(date: Date): Date {
    return new Date(date.toLocaleString('en-US', {timeZone: 'Asia/Jakarta'}));
}

/**
 * Get formatted time string in Indonesia timezone
 * @param {Date} date - Date to format (optional, uses current time if not provided)
 * @returns {string} Formatted date string
 */
export function getFormattedIndonesiaTime(date?: Date): string {
    const targetDate = date ? convertToIndonesiaTime(date) : getNowIndonesiaTime();
    return targetDate.toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

export function getCurrentMonthIdIndonesia(): string {
    const now = getNowIndonesiaTime();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}
