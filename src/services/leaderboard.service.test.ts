import { LeaderboardService } from "./leaderboard.service";
import { ScanRepository } from "../repositories/scan.repository";
import { UserRepository } from "../repositories/user.repository";
import { LeaderboardRepository } from "../repositories/leaderboard.repository";
import { getRedisClient } from "../config/redisClient";
import { getCurrentMonthIdIndonesia } from "../utils/time.util";

jest.mock("../config/redisClient");

describe("LeaderboardService", () => {
    let leaderboardService: LeaderboardService;
    let mockScanRepo: jest.Mocked<ScanRepository>;
    let mockUserRepo: jest.Mocked<UserRepository>;
    let mockArchiveRepo: jest.Mocked<LeaderboardRepository>;
    const currentPeriod = getCurrentMonthIdIndonesia();

    const mockRedis = {
        exists: jest.fn(),
        sendCommand: jest.fn(),
        multi: jest.fn(),
        del: jest.fn(),
        zAdd: jest.fn(),
        expire: jest.fn(),
        exec: jest.fn(),
        zIncrBy: jest.fn(),
        hIncrBy: jest.fn(),
        hGetAll: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockScanRepo = {
            findAll: jest.fn(),
        } as unknown as jest.Mocked<ScanRepository>;

        mockUserRepo = {
            findByIds: jest.fn(),
        } as unknown as jest.Mocked<UserRepository>;

        mockArchiveRepo = {
            bulkUpsert: jest.fn(),
        } as unknown as jest.Mocked<LeaderboardRepository>;

        (getRedisClient as jest.Mock).mockReturnValue(mockRedis);

        leaderboardService = new LeaderboardService(mockScanRepo, mockUserRepo, mockArchiveRepo);
    });

    describe("calculateDefectRatio", () => {
        it("should return correct ratio when total scans > 0", () => {
            expect(leaderboardService.calculateDefectRatio(100, 25)).toBe(0.25);
        });

        it("should return 0 when total scans is 0", () => {
            expect(leaderboardService.calculateDefectRatio(0, 0)).toBe(0);
        });
    });

    describe("recordCompletedScan", () => {
        it("should increment rank, total_scans and defect_scans when prediction is defect", async () => {
            const pipeline = {
                zIncrBy: jest.fn().mockReturnThis(),
                hIncrBy: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([1, 1, 1]),
            };
            mockRedis.multi.mockReturnValue(pipeline as any);

            await leaderboardService.recordCompletedScan(10, "crack");

            expect(pipeline.zIncrBy).toHaveBeenCalledWith(`leaderboard:rank:${currentPeriod}`, 1, "10");
            expect(pipeline.hIncrBy).toHaveBeenCalledWith(`leaderboard:stats:${currentPeriod}:user:10`, "total_scans", 1);
            expect(pipeline.hIncrBy).toHaveBeenCalledWith(`leaderboard:stats:${currentPeriod}:user:10`, "defect_scans", 1);
            expect(pipeline.exec).toHaveBeenCalled();
        });

        it("should not increment defect_scans when prediction is normal", async () => {
            const pipeline = {
                zIncrBy: jest.fn().mockReturnThis(),
                hIncrBy: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([1, 1]),
            };
            mockRedis.multi.mockReturnValue(pipeline as any);

            await leaderboardService.recordCompletedScan(10, "Normal");

            expect(pipeline.zIncrBy).toHaveBeenCalledWith(`leaderboard:rank:${currentPeriod}`, 1, "10");
            expect(pipeline.hIncrBy).toHaveBeenCalledWith(`leaderboard:stats:${currentPeriod}:user:10`, "total_scans", 1);
            expect(pipeline.hIncrBy).not.toHaveBeenCalledWith(`leaderboard:stats:${currentPeriod}:user:10`, "defect_scans", 1);
        });
    });

    describe("getMonthlyLeaderboard", () => {
        it("should return mapped leaderboard entries with user profiles and metrics", async () => {
            mockRedis.exists.mockResolvedValue(1);
            mockRedis.sendCommand.mockResolvedValue(["10", "20"]);

            const metricsPipeline = {
                hGetAll: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([
                    { total_scans: "100", defect_scans: "10" },
                    { total_scans: "50", defect_scans: "5" },
                ]),
            };
            mockRedis.multi.mockReturnValue(metricsPipeline as any);

            mockUserRepo.findByIds.mockResolvedValue([
                { id: 10, full_name: "Alice", email: "alice@example.com" } as any,
                { id: 20, full_name: "Bob", email: "bob@example.com" } as any,
            ]);

            const result = await leaderboardService.getMonthlyLeaderboard(10);

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                rank: 1,
                user_id: 10,
                name: "Alice",
                email: "alice@example.com",
                total_scans: 100,
                defect_scans: 10,
                ratio: 0.1,
            });
            expect(result[1]).toEqual({
                rank: 2,
                user_id: 20,
                name: "Bob",
                email: "bob@example.com",
                total_scans: 50,
                defect_scans: 5,
                ratio: 0.1,
            });
        });

        it("should return empty array if key does not exist and rebuild produces no data", async () => {
            mockRedis.exists.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
            mockScanRepo.findAll.mockResolvedValue([]);

            const result = await leaderboardService.getMonthlyLeaderboard(10);

            expect(result).toEqual([]);
        });
    });

    describe("syncLeaderboardToDb", () => {
        it("should read active users and stats from Redis and upsert to database", async () => {
            mockRedis.exists.mockResolvedValue(1);
            mockRedis.sendCommand.mockResolvedValue(["10"]);

            const statsPipeline = {
                hGetAll: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([{ total_scans: "50", defect_scans: "5" }]),
            };
            mockRedis.multi.mockReturnValue(statsPipeline as any);

            await leaderboardService.syncLeaderboardToDb(mockRedis);

            expect(mockArchiveRepo.bulkUpsert).toHaveBeenCalledWith([
                {
                    user_id: 10,
                    period: currentPeriod,
                    total_scans: 50,
                    defect_scans: 5,
                },
            ]);
        });
    });

    describe("rebuildLeaderboardCache", () => {
        it("should rebuild Redis sorted set and stats hashes from DB scans", async () => {
            const pipeline = {
                del: jest.fn().mockReturnThis(),
                zAdd: jest.fn().mockReturnThis(),
                hSet: jest.fn().mockReturnThis(),
                expire: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            };
            mockRedis.multi.mockReturnValue(pipeline as any);

            mockScanRepo.findAll.mockResolvedValue([
                { user_id: 1, prediction: "crack" } as any,
                { user_id: 1, prediction: "normal" } as any,
                { user_id: 2, prediction: "normal" } as any,
            ]);

            await leaderboardService.rebuildLeaderboardCache(mockRedis as any, currentPeriod);

            expect(pipeline.del).toHaveBeenCalledWith(`leaderboard:rank:${currentPeriod}`);
            expect(pipeline.zAdd).toHaveBeenCalledWith(`leaderboard:rank:${currentPeriod}`, [
                { score: 2, value: "1" },
            ]);
            expect(pipeline.zAdd).toHaveBeenCalledWith(`leaderboard:rank:${currentPeriod}`, [
                { score: 1, value: "2" },
            ]);
            expect(pipeline.hSet).toHaveBeenCalledWith(`leaderboard:stats:${currentPeriod}:user:1`, "total_scans", "2");
            expect(pipeline.hSet).toHaveBeenCalledWith(`leaderboard:stats:${currentPeriod}:user:1`, "defect_scans", "1");
            expect(pipeline.hSet).toHaveBeenCalledWith(`leaderboard:stats:${currentPeriod}:user:2`, "total_scans", "1");
            expect(pipeline.hSet).toHaveBeenCalledWith(`leaderboard:stats:${currentPeriod}:user:2`, "defect_scans", "0");
            expect(pipeline.expire).toHaveBeenCalledWith(`leaderboard:rank:${currentPeriod}`, 86400 * 60);
            expect(pipeline.exec).toHaveBeenCalled();
        });
    });
});
