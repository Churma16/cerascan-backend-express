import { QuotaService } from "./quota.service";
import { QuotaRepository } from "../repositories/quota.repository";
import { getRedisClient } from "../config/redisClient";
import { getSocket } from "../config/websocketClient";
import { sseClient } from "../config/sseClient";
import { UserQuotaAttributes } from "../models/userQuota.model";

jest.mock("../config/redisClient");
jest.mock("../config/websocketClient");
jest.mock("../config/sseClient");
jest.mock("../utils/logger.util", () => ({
    log: {
        info: jest.fn(),
        error: jest.fn(),
        success: jest.fn(),
        warn: jest.fn()
    }
}));

describe("QuotaService", () => {
    let quotaService: QuotaService;
    let mockQuotaRepository: jest.Mocked<QuotaRepository>;
    let mockSocketEmitter: { emit: jest.Mock };
    let mockSocketIo: { to: jest.Mock };

    const mockRedisClient = {
        get: jest.fn(),
        set: jest.fn(),
        decrBy: jest.fn(),
        incrBy: jest.fn(),
        keys: jest.fn(),
        mGet: jest.fn()
    };

    const createMockUserQuota = (overrides: Partial<UserQuotaAttributes> = {}) => {
        return {
            id: 1,
            user_id: 101,
            total_quota: 50,
            used_quota: 10,
            next_reset_date: new Date("2026-12-31"),
            save: jest.fn().mockResolvedValue(true),
            ...overrides
        } as any;
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockSocketEmitter = {
            emit: jest.fn()
        };

        mockSocketIo = {
            to: jest.fn().mockReturnValue(mockSocketEmitter)
        };

        (getRedisClient as jest.Mock).mockReturnValue(mockRedisClient);
        (getSocket as jest.Mock).mockReturnValue(mockSocketIo);

        mockQuotaRepository = {
            findByUserId: jest.fn(),
            findOne: jest.fn(),
            findAll: jest.fn(),
            create: jest.fn(),
            upsert: jest.fn(),
            update: jest.fn(),
            bulkCreate: jest.fn()
        } as unknown as jest.Mocked<QuotaRepository>;

        quotaService = new QuotaService(mockQuotaRepository);
    });

    describe("getQuotaByUserId", () => {
        it("should return user quota when record exists in repository", async () => {
            const targetUserId = 101;
            const mockQuotaRecord = createMockUserQuota({ user_id: targetUserId });
            mockQuotaRepository.findByUserId.mockResolvedValue(mockQuotaRecord);

            const resultQuota = await quotaService.getQuotaByUserId(targetUserId);

            expect(resultQuota).toEqual(mockQuotaRecord);
            expect(mockQuotaRepository.findByUserId).toHaveBeenCalledWith(targetUserId, undefined);
        });

        it("should throw an error when user quota record is not found", async () => {
            const nonExistentUserId = 999;
            mockQuotaRepository.findByUserId.mockResolvedValue(null);

            await expect(quotaService.getQuotaByUserId(nonExistentUserId)).rejects.toThrow(
                `User quota tidak ditemukan untuk user ID ${nonExistentUserId}`
            );
        });
    });

    describe("createQuota & updateQuota", () => {
        it("should delegate creation to the repository create method", async () => {
            const creationPayload = { user_id: 102, total_quota: 100, used_quota: 0 } as any;
            const createdRecord = createMockUserQuota(creationPayload);
            mockQuotaRepository.create.mockResolvedValue(createdRecord);

            const resultRecord = await quotaService.createQuota(creationPayload);

            expect(mockQuotaRepository.create).toHaveBeenCalledWith(creationPayload);
            expect(resultRecord).toEqual(createdRecord);
        });

        it("should update quota attributes after ensuring user quota exists", async () => {
            const targetUserId = 101;
            const initialQuotaRecord = createMockUserQuota({ user_id: targetUserId, total_quota: 50 });
            const updatedQuotaRecord = createMockUserQuota({ user_id: targetUserId, total_quota: 75 });

            mockQuotaRepository.findByUserId
                .mockResolvedValueOnce(initialQuotaRecord)
                .mockResolvedValueOnce(updatedQuotaRecord);
            mockQuotaRepository.update.mockResolvedValue(1);

            const resultQuota = await quotaService.updateQuota(targetUserId, { total_quota: 75 });

            expect(mockQuotaRepository.update).toHaveBeenCalledWith(targetUserId, { total_quota: 75 }, undefined);
            expect(resultQuota.total_quota).toBe(75);
        });
    });

    describe("incrementUsedQuota", () => {
        it("should increment used quota count and persist via repository", async () => {
            const targetUserId = 101;
            const existingQuotaRecord = createMockUserQuota({ user_id: targetUserId, used_quota: 5 });
            const updatedQuotaRecord = createMockUserQuota({ user_id: targetUserId, used_quota: 7 });

            mockQuotaRepository.findByUserId
                .mockResolvedValueOnce(existingQuotaRecord)
                .mockResolvedValueOnce(updatedQuotaRecord);
            mockQuotaRepository.update.mockResolvedValue(1);

            const resultRecord = await quotaService.incrementUsedQuota(targetUserId, 2);

            expect(mockQuotaRepository.update).toHaveBeenCalledWith(targetUserId, { used_quota: 7 }, undefined);
            expect(resultRecord.used_quota).toBe(7);
        });
    });

    describe("initializeUserQuota", () => {
        it("should upsert user quota in database and synchronize remaining quota to Redis", async () => {
            const targetUserId = 101;
            const totalQuotaAmount = 100;
            const mockUpsertRecord = createMockUserQuota({
                user_id: targetUserId,
                total_quota: totalQuotaAmount,
                used_quota: 0
            });

            mockQuotaRepository.upsert.mockResolvedValue([mockUpsertRecord, true]);
            mockRedisClient.set.mockResolvedValue("OK");
            mockRedisClient.get.mockResolvedValue(totalQuotaAmount.toString());

            const initializedQuota = await quotaService.initializeUserQuota({
                userId: targetUserId,
                totalQuota: totalQuotaAmount
            });

            expect(mockQuotaRepository.upsert).toHaveBeenCalledWith(
                {
                    user_id: targetUserId,
                    total_quota: totalQuotaAmount,
                    used_quota: 0,
                    next_reset_date: undefined
                },
                {
                    transaction: undefined,
                    returning: true
                }
            );

            const expectedRedisKey = `user:${targetUserId}:remaining_quota`;
            expect(mockRedisClient.set).toHaveBeenCalledWith(expectedRedisKey, "100", "EX", 86400 * 30);
            expect(initializedQuota).toEqual(mockUpsertRecord);
        });

        it("should handle Redis sync errors gracefully without failing database upsert", async () => {
            const targetUserId = 103;
            const mockUpsertRecord = createMockUserQuota({ user_id: targetUserId, total_quota: 20 });

            mockQuotaRepository.upsert.mockResolvedValue([mockUpsertRecord, true]);
            mockRedisClient.set.mockRejectedValue(new Error("Redis connection refused"));
            mockRedisClient.get.mockResolvedValue("20");

            const initializedQuota = await quotaService.initializeUserQuota({
                userId: targetUserId,
                totalQuota: 20
            });

            expect(initializedQuota).toEqual(mockUpsertRecord);
        });
    });

    describe("resetQuota", () => {
        it("should reset used quota to zero, save record, update Redis, and broadcast live update", async () => {
            const targetUserId = 101;
            const existingQuotaRecord = createMockUserQuota({
                user_id: targetUserId,
                total_quota: 50,
                used_quota: 30
            });

            mockQuotaRepository.findByUserId.mockResolvedValue(existingQuotaRecord);
            mockRedisClient.set.mockResolvedValue("OK");
            mockRedisClient.get.mockResolvedValue("50");

            const resetResult = await quotaService.resetQuota(targetUserId);

            expect(existingQuotaRecord.used_quota).toBe(0);
            expect(existingQuotaRecord.save).toHaveBeenCalled();
            expect(mockRedisClient.set).toHaveBeenCalledWith(
                `user:${targetUserId}:remaining_quota`,
                "50",
                "EX",
                86400
            );
            expect(resetResult.used_quota).toBe(0);
        });
    });

    describe("updateCustomQuota", () => {
        it("should update total quota, calculate remaining quota, and sync to Redis", async () => {
            const targetUserId = 101;
            const existingQuotaRecord = createMockUserQuota({
                user_id: targetUserId,
                total_quota: 50,
                used_quota: 10
            });

            mockQuotaRepository.findByUserId.mockResolvedValue(existingQuotaRecord);
            mockRedisClient.set.mockResolvedValue("OK");
            mockRedisClient.get.mockResolvedValue("90");

            const updatedResult = await quotaService.updateCustomQuota(targetUserId, 100);

            expect(existingQuotaRecord.total_quota).toBe(100);
            expect(existingQuotaRecord.save).toHaveBeenCalled();
            expect(mockRedisClient.set).toHaveBeenCalledWith(
                `user:${targetUserId}:remaining_quota`,
                "90",
                "EX",
                86400
            );
            expect(updatedResult.total_quota).toBe(100);
        });
    });

    describe("checkAndDecrementQuota", () => {
        it("should return true immediately when userId is undefined", async () => {
            const checkResult = await quotaService.checkAndDecrementQuota(undefined, 1);

            expect(checkResult).toBe(true);
            expect(mockRedisClient.get).not.toHaveBeenCalled();
        });

        it("should decrement quota and return true when Redis cache hit has sufficient quota", async () => {
            const targetUserId = 101;
            const quotaKey = `user:${targetUserId}:remaining_quota`;

            mockRedisClient.get.mockResolvedValue("10");
            mockRedisClient.decrBy.mockResolvedValue(9);

            const checkResult = await quotaService.checkAndDecrementQuota(targetUserId, 1);

            expect(checkResult).toBe(true);
            expect(mockRedisClient.decrBy).toHaveBeenCalledWith(quotaKey, 1);
        });

        it("should return false when Redis cache hit has insufficient quota", async () => {
            const targetUserId = 101;
            const quotaKey = `user:${targetUserId}:remaining_quota`;

            mockRedisClient.get.mockResolvedValue("0");

            const checkResult = await quotaService.checkAndDecrementQuota(targetUserId, 1);

            expect(checkResult).toBe(false);
            expect(mockRedisClient.decrBy).not.toHaveBeenCalled();
        });

        it("should populate cache from database on cache miss and decrement if quota is sufficient", async () => {
            const targetUserId = 101;
            const quotaKey = `user:${targetUserId}:remaining_quota`;
            const databaseQuotaRecord = createMockUserQuota({
                user_id: targetUserId,
                total_quota: 25,
                used_quota: 5
            });

            mockRedisClient.get.mockResolvedValueOnce(null).mockResolvedValueOnce("19");
            mockQuotaRepository.findByUserId.mockResolvedValue(databaseQuotaRecord);
            mockRedisClient.set.mockResolvedValue("OK");
            mockRedisClient.decrBy.mockResolvedValue(19);

            const checkResult = await quotaService.checkAndDecrementQuota(targetUserId, 1);

            expect(checkResult).toBe(true);
            expect(mockQuotaRepository.findByUserId).toHaveBeenCalledWith(targetUserId);
            expect(mockRedisClient.set).toHaveBeenCalledWith(quotaKey, "20", "EX", 86400);
            expect(mockRedisClient.decrBy).toHaveBeenCalledWith(quotaKey, 1);
        });

        it("should return false on cache miss when database record does not exist", async () => {
            const targetUserId = 105;

            mockRedisClient.get.mockResolvedValue(null);
            mockQuotaRepository.findByUserId.mockResolvedValue(null);

            const checkResult = await quotaService.checkAndDecrementQuota(targetUserId, 1);

            expect(checkResult).toBe(false);
            expect(mockRedisClient.decrBy).not.toHaveBeenCalled();
        });
    });

    describe("refundUserQuota", () => {
        it("should return early when userId is not provided", async () => {
            await quotaService.refundUserQuota(undefined, 1);

            expect(mockRedisClient.get).not.toHaveBeenCalled();
        });

        it("should increment quota in Redis when key exists", async () => {
            const targetUserId = 101;
            const quotaKey = `user:${targetUserId}:remaining_quota`;

            mockRedisClient.get.mockResolvedValue("5");
            mockRedisClient.incrBy.mockResolvedValue(6);

            await quotaService.refundUserQuota(targetUserId, 1);

            expect(mockRedisClient.incrBy).toHaveBeenCalledWith(quotaKey, 1);
        });

        it("should handle unexpected errors during refund without throwing", async () => {
            const targetUserId = 101;
            mockRedisClient.get.mockRejectedValue(new Error("Redis failure"));

            await expect(quotaService.refundUserQuota(targetUserId, 1)).resolves.not.toThrow();
        });
    });

    describe("broadcastLiveQuota", () => {
        it("should return null when userId is undefined", async () => {
            const broadcastResult = await quotaService.broadcastLiveQuota(undefined);

            expect(broadcastResult).toBeNull();
        });

        it("should broadcast remaining quota to Socket.IO and SSE client", async () => {
            const targetUserId = 101;
            mockRedisClient.get.mockResolvedValue("15");

            const remainingQuota = await quotaService.broadcastLiveQuota(targetUserId);

            expect(remainingQuota).toBe("15");
            expect(mockSocketIo.to).toHaveBeenCalledWith(`user_${targetUserId}_quota_left`);
            expect(mockSocketEmitter.emit).toHaveBeenCalledWith("quota_update", "15");
            expect(sseClient.emitToUser).toHaveBeenCalledWith("101", "quota_update", "15");
        });
    });
});
