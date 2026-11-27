import { UserService } from "./user.service";
import { UserRepository } from "../repositories/user.repository";
import { UserPlanLifecycleService } from "./userPlanLifecycle.service";
import * as authUtil from "../utils/auth.util";

jest.mock("./userPlanLifecycle.service");
jest.mock("../utils/auth.util");

describe("UserService", () => {
    let userService: UserService;
    let mockUserRepo: jest.Mocked<UserRepository>;

    const mockUserData = {
        id: 1,
        full_name: "John Doe",
        email: "john@example.com",
        password: "hashed_password",
        role: "user" as const,
        sub_tier: "free" as const,
        plan_id: 1,
        toJSON: jest.fn().mockReturnValue({
            id: 1,
            full_name: "John Doe",
            email: "john@example.com",
            password: "hashed_password",
            role: "user",
            sub_tier: "free",
            plan_id: 1
        })
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockUserRepo = {
            findById: jest.fn(),
            findByPk: jest.fn(),
            findByEmail: jest.fn(),
            findAll: jest.fn(),
            findByIds: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            destroy: jest.fn(),
            count: jest.fn()
        } as unknown as jest.Mocked<UserRepository>;

        userService = new UserService(mockUserRepo);
    });

    describe("getAllUsers", () => {
        it("should return all users from repository", async () => {
            mockUserRepo.findAll.mockResolvedValue([mockUserData as any]);

            const result = await userService.getAllUsers();

            expect(mockUserRepo.findAll).toHaveBeenCalledTimes(1);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(1);
        });
    });

    describe("getUserById", () => {
        it("should return user when user exists", async () => {
            mockUserRepo.findById.mockResolvedValue(mockUserData as any);

            const result = await userService.getUserById(1);

            expect(mockUserRepo.findById).toHaveBeenCalledWith(1, undefined);
            expect(result.id).toBe(1);
        });

        it("should throw error when user does not exist", async () => {
            mockUserRepo.findById.mockResolvedValue(null);

            await expect(userService.getUserById(999)).rejects.toThrow("Data pengguna tidak ditemukan");
        });
    });

    describe("updateUser", () => {
        it("should update user and hash password if password provided", async () => {
            mockUserRepo.findByPk.mockResolvedValue(mockUserData as any);
            mockUserRepo.update.mockResolvedValue(1);
            (authUtil.hashPassword as jest.Mock).mockResolvedValue("new_hashed_password");

            const result = await userService.updateUser(1, { full_name: "Jane Doe", password: "new_password" });

            expect(authUtil.hashPassword).toHaveBeenCalledWith("new_password");
            expect(mockUserRepo.update).toHaveBeenCalledWith(1, { full_name: "Jane Doe", password: "new_hashed_password" }, undefined);
            expect(result.password).toBeUndefined();
        });

        it("should throw error if user not found before update", async () => {
            mockUserRepo.findByPk.mockResolvedValue(null);

            await expect(userService.updateUser(999, { full_name: "Jane Doe" })).rejects.toThrow("User tidak ditemukan");
        });
    });

    describe("deleteUser", () => {
        it("should delete user when user exists", async () => {
            mockUserRepo.destroy.mockResolvedValue(true);

            const result = await userService.deleteUser(1);

            expect(mockUserRepo.destroy).toHaveBeenCalledWith(1, undefined);
            expect(result).toBe(true);
        });

        it("should throw error when user does not exist", async () => {
            mockUserRepo.destroy.mockResolvedValue(false);

            await expect(userService.deleteUser(999)).rejects.toThrow("User tidak ditemukan");
        });
    });

    describe("upgradeUserTier", () => {
        it("should delegate plan assignment to UserPlanLifecycleService", async () => {
            const mockAssignmentResult = {
                user: mockUserData,
                subscription: {} as any,
                userQuota: {} as any,
                remainingQuota: 50
            };
            (UserPlanLifecycleService.assignPlan as jest.Mock).mockResolvedValue(mockAssignmentResult as any);

            const result = await userService.upgradeUserTier(1, 2);

            expect(UserPlanLifecycleService.assignPlan).toHaveBeenCalledWith(1, 2, { transaction: undefined });
            expect(result).toEqual(mockAssignmentResult);
        });
    });

    describe("downgradeExpiredUsers", () => {
        it("should delegate to UserPlanLifecycleService", async () => {
            (UserPlanLifecycleService.downgradeExpiredUsers as jest.Mock).mockResolvedValue(5);

            const result = await userService.downgradeExpiredUsers();

            expect(UserPlanLifecycleService.downgradeExpiredUsers).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ updatedUsersCount: 5, updatedSubsCount: 5 });
        });
    });
});
