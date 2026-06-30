const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    disconnect: jest.fn(),
};

const mockUserRepository = {
    count: jest.fn(),
};

const mockScanRepository = {
    count: jest.fn(),
    aggregate: jest.fn(),
};

jest.mock('../user/infrastructure/SequelizeUserRepository', () => {
    return {
        SequelizeUserRepository: jest.fn().mockImplementation(() => mockUserRepository)
    };
});

jest.mock('../scan/infrastructure/SequelizeScanRepository', () => {
    return {
        SequelizeScanRepository: jest.fn().mockImplementation(() => mockScanRepository)
    };
});

// Menggunakan global object untuk membagikan mock reference melintasi batas hoisting Jest
(global as any).mockGetUserQuotaByUserIdExecute = jest.fn().mockResolvedValue(null);
(global as any).mockGetActiveSubscriptionExecute = jest.fn().mockResolvedValue(null);

jest.mock('../user_quota/use-cases/GetUserQuotaByUserIdUseCase', () => {
    return {
        GetUserQuotaByUserIdUseCase: jest.fn().mockImplementation(() => {
            return {
                execute: (global as any).mockGetUserQuotaByUserIdExecute
            };
        })
    };
});

jest.mock('../subscription/use-cases/GetActiveSubscriptionUseCase', () => {
    return {
        GetActiveSubscriptionUseCase: jest.fn().mockImplementation(() => {
            return {
                execute: (global as any).mockGetActiveSubscriptionExecute
            };
        })
    };
});

jest.mock('../../config/redis_client', () => {
    return {
        __esModule: true,
        connectRedis: jest.fn(),
        getRedisClient: () => mockRedis,
    };
});

jest.mock('../../utils/time.helper', () => {
    return {
        __esModule: true,
        getNowIndonesiaTime: jest.fn(() => new Date('2026-06-18T12:00:00Z')),
    };
});

import { GetDashboardKPIUseCase } from './use-cases/GetDashboardKPIUseCase';
import { Op } from 'sequelize';

const mockGetUserQuotaByUserIdExecute = (global as any).mockGetUserQuotaByUserIdExecute;
const mockGetActiveSubscriptionExecute = (global as any).mockGetActiveSubscriptionExecute;

describe('GetDashboardKPIUseCase', () => {
    let useCase: GetDashboardKPIUseCase;

    beforeEach(() => {
        useCase = new GetDashboardKPIUseCase(mockUserRepository as any, mockScanRepository as any);
        jest.clearAllMocks();
        mockRedis.get.mockReset();
        mockRedis.set.mockReset();
        // Reset mock implementations to default resolved promise values
        mockGetUserQuotaByUserIdExecute.mockReset();
        mockGetUserQuotaByUserIdExecute.mockResolvedValue(null);
        mockGetActiveSubscriptionExecute.mockReset();
        mockGetActiveSubscriptionExecute.mockResolvedValue(null);
    });

    describe('getDashboardKPI', () => {
        it('should return KPI data for admin role (no userId filter on scan/user queries)', async () => {
            (mockUserRepository.count as jest.Mock).mockResolvedValue(15);
            (mockScanRepository.aggregate as jest.Mock).mockResolvedValue(0.85);
            (mockScanRepository.count as jest.Mock).mockImplementation((options: any) => {
                const where = options.where || {};
                const hasPrediction = 'prediction' in where;
                const hasCreatedAt = 'createdAt' in where;

                if (options.distinct && options.col === 'user_id') {
                    return Promise.resolve(5); // activeUsersThisMonth
                }
                if (hasPrediction && hasCreatedAt) {
                    return Promise.resolve(2); // defectCountThisMonth
                }
                if (hasPrediction) {
                    return Promise.resolve(10); // unNormalScanCount
                }
                if (hasCreatedAt) {
                    if (where.createdAt[Op.lte]) {
                        return Promise.resolve(40); // totalScansLastMonth
                    }
                    return Promise.resolve(50); // totalScansThisMonth
                }
                return Promise.resolve(100); // totalScans
            });

            // Call service with admin
            const result = await useCase.execute(undefined, 'admin');

            // Assertions
            expect(result.totalScans).toBe(100);
            expect(result.totalUsers).toBe(15);
            expect(result.averageScanAccuracy).toBe(0.85);
            expect(result.unNormalScanCount).toBe(10);
            expect(result.totalScansThisMonth).toBe(50);
            expect(result.scanChangeText).toBe('Naik 25% dari bulan lalu'); // (50 - 40) / 40 = 25%
            expect(result.defectRate).toBe(4); // (2 / 50) * 100 = 4%
            expect(result.defectCountThisMonth).toBe(2);
            expect(result.activeUsersThisMonth).toBe(5);

            // Admin without userId should not fetch quota or subscription
            expect(result.userQuota).toBeNull();
            expect(result.activeSubscription).toBeNull();
            expect(mockGetUserQuotaByUserIdExecute).not.toHaveBeenCalled();
            expect(mockGetActiveSubscriptionExecute).not.toHaveBeenCalled();

            // Verify where clauses do not contain user_id
            expect(mockUserRepository.count).toHaveBeenCalledWith({ where: {} });
            expect(mockScanRepository.count).toHaveBeenCalledWith({ where: {} });
        });

        it('should return KPI data for regular user and filter by userId', async () => {
            (mockUserRepository.count as jest.Mock).mockResolvedValue(1);
            (mockScanRepository.aggregate as jest.Mock).mockResolvedValue(0.9);
            (mockScanRepository.count as jest.Mock).mockImplementation((options: any) => {
                const where = options.where || {};
                const hasPrediction = 'prediction' in where;
                const hasCreatedAt = 'createdAt' in where;

                if (options.distinct && options.col === 'user_id') {
                    return Promise.resolve(1);
                }
                if (hasPrediction && hasCreatedAt) {
                    return Promise.resolve(1);
                }
                if (hasPrediction) {
                    return Promise.resolve(3);
                }
                if (hasCreatedAt) {
                    if (where.createdAt[Op.lte]) {
                        return Promise.resolve(10);
                    }
                    return Promise.resolve(20);
                }
                return Promise.resolve(30);
            });

            // Mock quota and subscription
            mockGetUserQuotaByUserIdExecute.mockResolvedValue({
                total_quota: 1000,
                used_quota: 200,
                next_reset_date: new Date('2026-07-01T00:00:00Z'),
            });
            mockGetActiveSubscriptionExecute.mockResolvedValue({
                plan: { name: 'Premium Plan' },
                status: 'active',
                end_date: new Date('2026-07-18T00:00:00Z'),
            });

            // Mock Redis cache hit
            mockRedis.get.mockResolvedValue('750'); // remaining quota

            const result = await useCase.execute(8, 'user');

            // Assertions
            expect(result.totalScans).toBe(30);
            expect(result.totalUsers).toBe(1);
            expect(result.scanChangeText).toBe('Naik 100% dari bulan lalu'); // (20 - 10) / 10 = 100%
            expect(result.defectRate).toBe(5); // (1 / 20) * 100 = 5%

            // Check where clause contains user_id
            expect(mockUserRepository.count).toHaveBeenCalledWith({ where: { id: 8 } });
            expect(mockScanRepository.count).toHaveBeenCalledWith({ where: { user_id: 8 } });

            // Check Quota and Subscription
            expect(mockGetUserQuotaByUserIdExecute).toHaveBeenCalledWith(8);
            expect(mockGetActiveSubscriptionExecute).toHaveBeenCalledWith(8);

            expect(result.userQuota).toEqual({
                total_quota: 1000,
                used_quota: 250, // total(1000) - remaining(750) = 250
                remaining_quota: 750,
                is_quota_low: false, // 750/1000 = 75% > 20% and 750 > 200
                next_reset_date: new Date('2026-07-01T00:00:00Z'),
            });

            expect(result.activeSubscription).toEqual({
                plan_name: 'Premium Plan',
                status: 'active',
                end_date: new Date('2026-07-18T00:00:00Z'),
            });
        });

        it('should handle Redis cache miss and populate key for user quota', async () => {
            (mockUserRepository.count as jest.Mock).mockResolvedValue(1);
            (mockScanRepository.aggregate as jest.Mock).mockResolvedValue(0.9);
            (mockScanRepository.count as jest.Mock).mockResolvedValue(10);

            // Mock quota and subscription
            mockGetUserQuotaByUserIdExecute.mockResolvedValue({
                total_quota: 1000,
                used_quota: 400,
                next_reset_date: null,
            });
            mockGetActiveSubscriptionExecute.mockResolvedValue(null);

            // Mock Redis cache miss
            mockRedis.get.mockResolvedValue(null);

            const result = await useCase.execute(8, 'user');

            // Redis set should be called to populate the remaining quota cache
            expect(mockRedis.get).toHaveBeenCalledWith('user:8:remaining_quota');
            expect(mockRedis.set).toHaveBeenCalledWith('user:8:remaining_quota', '600', 'EX', 86400);

            expect(result.userQuota).toEqual({
                total_quota: 1000,
                used_quota: 400,
                remaining_quota: 600,
                is_quota_low: false, // 600 remaining (60% remaining)
                next_reset_date: null,
            });
        });

        it('should identify user quota as low when threshold criteria is met', async () => {
            (mockUserRepository.count as jest.Mock).mockResolvedValue(1);
            (mockScanRepository.aggregate as jest.Mock).mockResolvedValue(0.9);
            (mockScanRepository.count as jest.Mock).mockResolvedValue(10);

            // Scenario 1: remaining/total <= 20%
            mockGetUserQuotaByUserIdExecute.mockResolvedValue({
                total_quota: 1000,
                used_quota: 850, // 150 remaining (15% which is <= 20%)
            });
            mockRedis.get.mockResolvedValue(null);

            let result = await useCase.execute(8, 'user');
            expect(result.userQuota?.is_quota_low).toBe(true);

            // Scenario 2: remaining <= 200
            mockGetUserQuotaByUserIdExecute.mockResolvedValue({
                total_quota: 2000,
                used_quota: 1810, // 190 remaining (9.5% remaining, also <= 200)
            });
            result = await useCase.execute(8, 'user');
            expect(result.userQuota?.is_quota_low).toBe(true);
        });

        it('should handle errors in UserQuotaService and SubscriptionService gracefully', async () => {
            (mockUserRepository.count as jest.Mock).mockResolvedValue(1);
            (mockScanRepository.aggregate as jest.Mock).mockResolvedValue(0.9);
            (mockScanRepository.count as jest.Mock).mockResolvedValue(10);

            // Force services to reject
            mockGetUserQuotaByUserIdExecute.mockRejectedValue(new Error('Quota DB error'));
            mockGetActiveSubscriptionExecute.mockRejectedValue(new Error('Subscription DB error'));

            const result = await useCase.execute(8, 'user');

            // Result should be returned without throwing
            expect(result.userQuota).toBeNull();
            expect(result.activeSubscription).toBeNull();
        });

        it('should compute scan growth messages properly for different trends', async () => {
            (mockUserRepository.count as jest.Mock).mockResolvedValue(1);
            (mockScanRepository.aggregate as jest.Mock).mockResolvedValue(0.9);

            // Scenario: Total scans last month is 0, this month is > 0
            (mockScanRepository.count as jest.Mock).mockImplementation((options: any) => {
                const where = options.where || {};
                const hasCreatedAt = 'createdAt' in where;
                if (hasCreatedAt) {
                    if (where.createdAt[Op.lte]) {
                        return Promise.resolve(0); // last month
                    }
                    return Promise.resolve(10); // this month
                }
                return Promise.resolve(10);
            });

            let result = await useCase.execute(8, 'user');
            expect(result.scanChangeText).toBe('Naik 100% dari bulan lalu');

            // Scenario: Total scans last month is 10, this month is 5 (decrease)
            (mockScanRepository.count as jest.Mock).mockImplementation((options: any) => {
                const where = options.where || {};
                const hasCreatedAt = 'createdAt' in where;
                if (hasCreatedAt) {
                    if (where.createdAt[Op.lte]) {
                        return Promise.resolve(10); // last month
                    }
                    return Promise.resolve(5); // this month
                }
                return Promise.resolve(10);
            });

            result = await useCase.execute(8, 'user');
            expect(result.scanChangeText).toBe('Turun 50% dari bulan lalu');

            // Scenario: Total scans last month is 10, this month is 10 (no change)
            (mockScanRepository.count as jest.Mock).mockImplementation((options: any) => {
                const where = options.where || {};
                const hasCreatedAt = 'createdAt' in where;
                if (hasCreatedAt) {
                    if (where.createdAt[Op.lte]) {
                        return Promise.resolve(10); // last month
                    }
                    return Promise.resolve(10); // this month
                }
                return Promise.resolve(10);
            });

            result = await useCase.execute(8, 'user');
            expect(result.scanChangeText).toBe('Stabil dari bulan lalu');
        });
    });
});
