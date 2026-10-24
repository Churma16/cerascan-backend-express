import { hashPassword, comparePassword, generateOtp } from "./auth.util";

describe("auth.util", () => {
    describe("hashPassword and comparePassword", () => {
        const plainPassword = "SuperSecretPassword123!";

        it("should generate a hash that is distinct from the plain text password", async () => {
            const hashedPassword = await hashPassword(plainPassword);

            expect(hashedPassword).toBeDefined();
            expect(typeof hashedPassword).toBe("string");
            expect(hashedPassword).not.toBe(plainPassword);
            expect(hashedPassword.startsWith("$2")).toBe(true);
        });

        it("should generate different hashes for identical passwords due to salt generation", async () => {
            const firstHashedPassword = await hashPassword(plainPassword);
            const secondHashedPassword = await hashPassword(plainPassword);

            expect(firstHashedPassword).not.toBe(secondHashedPassword);
        });

        it("should return true when comparing matching password with its hash", async () => {
            const hashedPassword = await hashPassword(plainPassword);
            const isMatch = await comparePassword(plainPassword, hashedPassword);

            expect(isMatch).toBe(true);
        });

        it("should return false when comparing non-matching password with hash", async () => {
            const hashedPassword = await hashPassword(plainPassword);
            const isMatch = await comparePassword("WrongPasswordInput!", hashedPassword);

            expect(isMatch).toBe(false);
        });

        it("should return false when comparing against an empty or malformed hash", async () => {
            const isMatch = await comparePassword(plainPassword, "invalid_hash_string");

            expect(isMatch).toBe(false);
        });
    });

    describe("generateOtp", () => {
        it("should generate a 6-digit numeric string", () => {
            const { otp } = generateOtp();

            expect(otp).toBeDefined();
            expect(typeof otp).toBe("string");
            expect(otp).toHaveLength(6);
            expect(Number(otp)).toBeGreaterThanOrEqual(100000);
            expect(Number(otp)).toBeLessThanOrEqual(999999);
        });

        it("should return an expiration date approximately 10 minutes in the future", () => {
            const beforeExecutionTimestamp = Date.now();
            const { expiredAt } = generateOtp();
            const afterExecutionTimestamp = Date.now();

            const expectedDurationMilliseconds = 10 * 60 * 1000;
            const expiredAtTimestamp = expiredAt.getTime();

            expect(expiredAt).toBeInstanceOf(Date);
            expect(expiredAtTimestamp).toBeGreaterThanOrEqual(beforeExecutionTimestamp + expectedDurationMilliseconds);
            expect(expiredAtTimestamp).toBeLessThanOrEqual(afterExecutionTimestamp + expectedDurationMilliseconds + 50);
        });
    });
});
