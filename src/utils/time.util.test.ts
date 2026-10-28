import {
    getNowIndonesiaTime,
    getStartOfDayIndonesiaTime,
    getEndOfDayIndonesiaTime,
    convertToIndonesiaTime,
    getFormattedIndonesiaTime,
    getCurrentMonthIdIndonesia
} from "./time.util";

describe("time.util", () => {
    describe("getNowIndonesiaTime", () => {
        it("should return a valid Date instance", () => {
            const currentIndonesiaTime = getNowIndonesiaTime();

            expect(currentIndonesiaTime).toBeInstanceOf(Date);
            expect(Number.isNaN(currentIndonesiaTime.getTime())).toBe(false);
        });
    });

    describe("getStartOfDayIndonesiaTime", () => {
        it("should set hours, minutes, seconds, and milliseconds to the beginning of the day", () => {
            const startOfDayTime = getStartOfDayIndonesiaTime();

            expect(startOfDayTime.getHours()).toBe(0);
            expect(startOfDayTime.getMinutes()).toBe(0);
            expect(startOfDayTime.getSeconds()).toBe(0);
            expect(startOfDayTime.getMilliseconds()).toBe(0);
        });
    });

    describe("getEndOfDayIndonesiaTime", () => {
        it("should set hours, minutes, seconds, and milliseconds to the end of the day", () => {
            const endOfDayTime = getEndOfDayIndonesiaTime();

            expect(endOfDayTime.getHours()).toBe(23);
            expect(endOfDayTime.getMinutes()).toBe(59);
            expect(endOfDayTime.getSeconds()).toBe(59);
            expect(endOfDayTime.getMilliseconds()).toBe(999);
        });
    });

    describe("convertToIndonesiaTime", () => {
        it("should successfully convert an existing Date instance", () => {
            const sampleUtcDate = new Date("2026-06-15T12:00:00Z");
            const convertedDate = convertToIndonesiaTime(sampleUtcDate);

            expect(convertedDate).toBeInstanceOf(Date);
            expect(Number.isNaN(convertedDate.getTime())).toBe(false);
        });
    });

    describe("getFormattedIndonesiaTime", () => {
        it("should return a non-empty formatted date-time string", () => {
            const sampleDate = new Date("2026-06-15T10:30:45Z");
            const formattedTimeString = getFormattedIndonesiaTime(sampleDate);

            expect(typeof formattedTimeString).toBe("string");
            expect(formattedTimeString.length).toBeGreaterThan(0);
        });

        it("should use current time when date parameter is not provided", () => {
            const formattedCurrentTimeString = getFormattedIndonesiaTime();

            expect(typeof formattedCurrentTimeString).toBe("string");
            expect(formattedCurrentTimeString.length).toBeGreaterThan(0);
        });
    });

    describe("getCurrentMonthIdIndonesia", () => {
        it("should return month identifier in YYYY-MM format", () => {
            const monthIdentifier = getCurrentMonthIdIndonesia();
            const yearMonthPattern = /^\d{4}-\d{2}$/;

            expect(monthIdentifier).toMatch(yearMonthPattern);
        });
    });
});
