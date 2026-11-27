import { StorageService } from "./storage.service";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client } from "../config/r2Client";
import { getRedisClient } from "../config/redisClient";

jest.mock("@aws-sdk/s3-request-presigner", () => ({
    getSignedUrl: jest.fn(),
}));

jest.mock("../config/r2Client", () => ({
    r2Client: {
        send: jest.fn(),
    },
}));

jest.mock("../config/redisClient", () => ({
    getRedisClient: jest.fn(),
}));

jest.mock("../utils/logger.util", () => ({
    log: {
        info: jest.fn(),
        error: jest.fn(),
    },
}));

describe("StorageService - Presigned URL Caching (Issue #29)", () => {
    let storageService: StorageService;
    let mockRedisClient: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRedisClient = {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
        };
        (getRedisClient as jest.Mock).mockReturnValue(mockRedisClient);
        storageService = new StorageService();
    });

    it("should return cached presigned URL on Redis cache hit without calling getSignedUrl", async () => {
        const objectKey = "scans-dev/cached-image.jpg";
        const cachedUrl = "https://r2.storage/scans-dev/cached-image.jpg?signed=true";
        mockRedisClient.get.mockResolvedValue(cachedUrl);

        const result = await storageService.getPresignedUrl(objectKey);

        expect(result).toBe(cachedUrl);
        expect(mockRedisClient.get).toHaveBeenCalledWith(`presigned_url:${objectKey}`);
        expect(getSignedUrl).not.toHaveBeenCalled();
    });

    it("should generate presigned URL and cache in Redis on cache miss", async () => {
        const objectKey = "scans-dev/new-image.jpg";
        const generatedUrl = "https://r2.storage/scans-dev/new-image.jpg?signed=new";
        mockRedisClient.get.mockResolvedValue(null);
        (getSignedUrl as jest.Mock).mockResolvedValue(generatedUrl);

        const result = await storageService.getPresignedUrl(objectKey, 3600);

        expect(result).toBe(generatedUrl);
        expect(mockRedisClient.get).toHaveBeenCalledWith(`presigned_url:${objectKey}`);
        expect(getSignedUrl).toHaveBeenCalled();
        expect(mockRedisClient.set).toHaveBeenCalledWith(
            `presigned_url:${objectKey}`,
            generatedUrl,
            "EX",
            3300
        );
    });

    it("should invalidate cached presigned URL when file is deleted", async () => {
        const objectKey = "scans-dev/delete-image.jpg";
        (r2Client.send as jest.Mock).mockResolvedValue({});

        await storageService.deleteFile(objectKey);

        expect(mockRedisClient.del).toHaveBeenCalledWith(`presigned_url:${objectKey}`);
    });
});
