import { generateToken, verifyToken } from "./jwt.util";

describe("jwt.util", () => {
    const samplePayload = {
        userId: 101,
        userEmail: "tester@example.com",
        userRole: "premium_user"
    };

    describe("generateToken", () => {
        it("should generate a valid JWT token string containing three dot-separated segments", () => {
            const token = generateToken(samplePayload);

            expect(token).toBeDefined();
            expect(typeof token).toBe("string");

            const tokenSegments = token.split(".");
            expect(tokenSegments).toHaveLength(3);
        });

        it("should generate different tokens when called with different payloads", () => {
            const firstToken = generateToken({ userId: 1 });
            const secondToken = generateToken({ userId: 2 });

            expect(firstToken).not.toBe(secondToken);
        });
    });

    describe("verifyToken", () => {
        it("should decode and return matching payload for a valid token", () => {
            const token = generateToken(samplePayload, "1h");
            const decodedPayload = verifyToken(token) as typeof samplePayload & { exp: number; iat: number };

            expect(decodedPayload).not.toBeNull();
            expect(decodedPayload.userId).toBe(samplePayload.userId);
            expect(decodedPayload.userEmail).toBe(samplePayload.userEmail);
            expect(decodedPayload.userRole).toBe(samplePayload.userRole);
            expect(decodedPayload.exp).toBeDefined();
            expect(decodedPayload.iat).toBeDefined();
        });

        it("should return null when verifying a malformed or altered token string", () => {
            const validToken = generateToken(samplePayload);
            const tamperedToken = validToken.slice(0, -6) + "xyz123";

            const verificationResult = verifyToken(tamperedToken);

            expect(verificationResult).toBeNull();
        });

        it("should return null when token string is empty or invalid format", () => {
            const emptyStringVerification = verifyToken("");
            const invalidStringVerification = verifyToken("random_invalid_string");

            expect(emptyStringVerification).toBeNull();
            expect(invalidStringVerification).toBeNull();
        });

        it("should return null when token has expired", async () => {
            const quicklyExpiredToken = generateToken(samplePayload, "-1s");
            const verificationResult = verifyToken(quicklyExpiredToken);

            expect(verificationResult).toBeNull();
        });
    });
});
