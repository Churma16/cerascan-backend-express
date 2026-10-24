import { Op } from "sequelize";
import { quotaRepository, QuotaRepository } from "../repositories/quota.repository";
import { getRedisClient } from "../config/redisClient";
import { getSocket } from "../config/websocketClient";
import { sseClient } from "../config/sseClient";
import { UserQuotaModel } from "../models";
import { UserQuotaAttributes } from "../models/userQuota.model";

export class QuotaService {
    private repository: QuotaRepository;

    constructor(customRepository: QuotaRepository = quotaRepository) {
        this.repository = customRepository;
    }

    async createQuota(payload: Partial<UserQuotaAttributes>): Promise<UserQuotaModel> {
        return await this.repository.create(payload);
    }

    async getQuotaByUserId(userId: number): Promise<UserQuotaModel> {
        const quota = await this.repository.findByUserId(userId);
        if (!quota) {
            throw new Error(`User quota tidak ditemukan untuk user ID ${userId}`);
        }
        return quota;
    }

    async updateQuota(userId: number, payload: Partial<UserQuotaAttributes>): Promise<UserQuotaModel> {
        await this.getQuotaByUserId(userId);
        await this.repository.update(userId, payload);
        return await this.getQuotaByUserId(userId);
    }

    async incrementUsedQuota(userId: number, amount: number): Promise<UserQuotaModel> {
        const quota = await this.getQuotaByUserId(userId);
        const newUsedQuota = quota.used_quota + amount;
        await this.repository.update(userId, { used_quota: newUsedQuota });
        return await this.getQuotaByUserId(userId);
    }

    async resetQuota(userId: number): Promise<UserQuotaModel> {
        await this.getQuotaByUserId(userId);
        await this.repository.update(userId, { used_quota: 0 });
        return await this.getQuotaByUserId(userId);
    }

    async checkAndDecrementQuota(userId: number | undefined, totalImages: number = 1): Promise<boolean> {
        if (!userId) {
            return true;
        }

        const redis = getRedisClient();
        const quotaKey = `user:${userId}:remaining_quota`;

        let currentQuota = await redis.get(quotaKey);

        if (currentQuota === null) {
            const userQuotaRecord = await this.repository.findByUserId(userId);
            if (!userQuotaRecord) {
                console.error(`[Quota] Record kuota tidak ditemukan untuk user ${userId}`);
                return false;
            }

            const remaining = userQuotaRecord.total_quota - userQuotaRecord.used_quota;
            currentQuota = remaining.toString();
            await redis.set(quotaKey, currentQuota, "EX", 86400);
        }

        if (parseInt(currentQuota) < totalImages) {
            return false;
        }

        await redis.decrBy(quotaKey, totalImages);
        this.broadcastLiveQuota(userId).catch(error => {
            console.error("[Quota] Gagal memancarkan update kuota live:", error);
        });

        return true;
    }

    async refundUserQuota(userId: number | undefined, amount: number = 1): Promise<void> {
        if (!userId) {
            return;
        }

        try {
            const redis = getRedisClient();
            const quotaKey = `user:${userId}:remaining_quota`;
            const currentQuota = await redis.get(quotaKey);

            if (currentQuota !== null) {
                await redis.incrBy(quotaKey, amount);
            }

            await this.broadcastLiveQuota(userId);
        } catch (error) {
            console.error(`[Refund Quota] Gagal mengembalikan kuota untuk user ${userId}:`, error);
        }
    }

    async broadcastLiveQuota(userId: number | undefined): Promise<string | null> {
        if (!userId) {
            return null;
        }

        const redis = getRedisClient();
        const quotaKey = `user:${userId}:remaining_quota`;
        let currentQuota = await redis.get(quotaKey);

        if (currentQuota === null) {
            const userQuotaRecord = await this.repository.findByUserId(userId);
            if (userQuotaRecord) {
                const remaining = userQuotaRecord.total_quota - userQuotaRecord.used_quota;
                currentQuota = remaining >= 0 ? remaining.toString() : "0";
                await redis.set(quotaKey, currentQuota, "EX", 86400);
            } else {
                currentQuota = "0";
            }
        }

        const socketIo = getSocket();
        socketIo.to(`user_${userId}_quota_left`).emit("quota_update", currentQuota);
        sseClient.emitToUser(userId.toString(), "quota_update", currentQuota);

        return currentQuota;
    }

    async upsertQuotaToRedis(userId: number, quota: number): Promise<void> {
        const redis = getRedisClient();
        const quotaKey = `user:${userId}:remaining_quota`;
        await redis.set(quotaKey, quota.toString(), "EX", 86400);
    }

    async syncQuotasToDatabase(redisClient: any): Promise<void> {
        const keys = await redisClient.keys("user:*:remaining_quota");
        if (!keys || keys.length === 0) {
            return;
        }

        const redisValues = await redisClient.mGet(keys);
        const quotaMap = new Map<number, number>();
        const userIds: number[] = [];

        keys.forEach((key: string, index: number) => {
            const value = redisValues[index];
            if (value !== null && value !== undefined) {
                const userId = parseInt(key.split(":")[1]);
                quotaMap.set(userId, parseInt(value as string));
                userIds.push(userId);
            }
        });

        if (userIds.length === 0) {
            return;
        }

        const userQuotas = await this.repository.findAll({
            where: { user_id: { [Op.in]: userIds } }
        });

        const quotasToUpdate: Array<Partial<UserQuotaAttributes>> = [];

        for (const userQuota of userQuotas) {
            const remainingQuota = quotaMap.get(userQuota.user_id);
            if (remainingQuota !== undefined) {
                const used = userQuota.total_quota - remainingQuota;
                quotasToUpdate.push({
                    id: userQuota.id,
                    user_id: userQuota.user_id,
                    total_quota: userQuota.total_quota,
                    used_quota: used >= 0 ? used : 0
                });
            }
        }

        if (quotasToUpdate.length > 0) {
            await this.repository.bulkCreate(quotasToUpdate, {
                updateOnDuplicate: ["used_quota"]
            });
        }
    }
}

export const quotaService = new QuotaService();
