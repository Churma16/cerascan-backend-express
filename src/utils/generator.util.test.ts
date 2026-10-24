import { generateId } from "./generator.util";

describe("generator.util", () => {
    describe("generateId", () => {
        it("should generate a string with exactly 8 characters", () => {
            const generatedIdentifier = generateId();

            expect(generatedIdentifier).toBeDefined();
            expect(typeof generatedIdentifier).toBe("string");
            expect(generatedIdentifier).toHaveLength(8);
        });

        it("should only contain uppercase alphanumeric characters", () => {
            const allowedCharacterPattern = /^[0-9A-Z]{8}$/;

            for (let iterationIndex = 0; iterationIndex < 20; iterationIndex++) {
                const generatedIdentifier = generateId();
                expect(generatedIdentifier).toMatch(allowedCharacterPattern);
            }
        });

        it("should generate distinct identifiers across consecutive invocations", () => {
            const identifierCollection = new Set<string>();
            const totalSamples = 50;

            for (let sampleIndex = 0; sampleIndex < totalSamples; sampleIndex++) {
                identifierCollection.add(generateId());
            }

            expect(identifierCollection.size).toBe(totalSamples);
        });
    });
});
