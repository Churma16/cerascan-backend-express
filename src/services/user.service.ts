import { Transaction } from "sequelize";
import type { User } from "../models";
import { userRepository, UserRepository } from "../repositories/user.repository";
import type { UserAttributes } from "../models/user.model";
import { hashPassword } from "../utils/auth.util";
import { UserPlanLifecycleService } from "./userPlanLifecycle.service";

export class UserService {
    private userRepo: UserRepository;

    constructor(userRepo: UserRepository = userRepository) {
        this.userRepo = userRepo;
    }

    async getAllUsers(transaction?: Transaction): Promise<User[]> {
        return await this.userRepo.findAll(transaction);
    }

    async getUserById(userId: number, transaction?: Transaction): Promise<User> {
        const user = await this.userRepo.findById(userId, transaction);
        if (!user) {
            throw new Error("Data pengguna tidak ditemukan");
        }
        return user;
    }

    async updateUser(userId: number, data: Partial<UserAttributes>, transaction?: Transaction): Promise<any> {
        const user = await this.userRepo.findByPk(userId, transaction);
        if (!user) {
            throw new Error("User tidak ditemukan");
        }

        const updateData = { ...data };
        if (updateData.password) {
            updateData.password = await hashPassword(updateData.password);
        }

        await this.userRepo.update(userId, updateData as any, transaction);

        const updatedUser = await this.userRepo.findByPk(userId, transaction);
        if (!updatedUser) {
            throw new Error("User tidak ditemukan setelah diupdate");
        }

        const rawData = typeof updatedUser.toJSON === "function" ? updatedUser.toJSON() : updatedUser;
        const userJSON = { ...(rawData || {}) };
        delete (userJSON as any).password;
        return userJSON;
    }

    async deleteUser(userId: number, transaction?: Transaction): Promise<boolean> {
        const isDeleted = await this.userRepo.destroy(userId, transaction);
        if (!isDeleted) {
            throw new Error("User tidak ditemukan");
        }
        return true;
    }

    async upgradeUserTier(userId: number, planId: number, transaction?: Transaction): Promise<any> {
        return await UserPlanLifecycleService.assignPlan(userId, planId, { transaction });
    }

    async downgradeExpiredUsers(today: Date = new Date()): Promise<{ updatedUsersCount: number; updatedSubsCount: number }> {
        const downgradedCount = await UserPlanLifecycleService.downgradeExpiredUsers(today);
        return { updatedUsersCount: downgradedCount, updatedSubsCount: downgradedCount };
    }
}

export const userService = new UserService();
