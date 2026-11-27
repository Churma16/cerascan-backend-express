import { DlqService } from "./dlq.service";
import { DeadLetterMessage, Scan } from "../models";
import { RabbitmqPublisher } from "../transport/rabbitmq/infrastructure/rabbitmq.publisher";
import { quotaService } from "./quota.service";
import { NotificationService } from "./notification.service";
import { getRabbitChannel } from "../config/rabbitmqClient";

jest.mock("../models", () => ({
    DeadLetterMessage: {
        findAll: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
    },
    Scan: {
        update: jest.fn(),
    },
}));
jest.mock("../transport/rabbitmq/infrastructure/rabbitmq.publisher");
jest.mock("./quota.service");
jest.mock("./notification.service");
jest.mock("../config/rabbitmqClient");
jest.mock("../utils/logger.util", () => ({
    log: {
        info: jest.fn(),
        error: jest.fn(),
        success: jest.fn(),
        warn: jest.fn(),
    },
}));

describe("DlqService", () => {
    let dlqService: DlqService;

    beforeEach(() => {
        jest.clearAllMocks();
        dlqService = new DlqService();
    });

    describe("getDlqMessages", () => {
        it("should retrieve and map dead letter records for admin", async () => {
            const mockRecord = {
                toJSON: jest.fn().mockReturnValue({
                    id: 1,
                    message_id: "msg-123",
                    user_id: 10,
                    routing_key: "scan.process",
                    payload: { foo: "bar" },
                    error_message: "timeout",
                    retry_count: 1,
                    status: "dead",
                    createdAt: new Date(),
                }),
            };
            (DeadLetterMessage.findAll as jest.Mock).mockResolvedValue([mockRecord]);

            const result = await dlqService.getDlqMessages(10, true, 50);

            expect(DeadLetterMessage.findAll).toHaveBeenCalledWith({
                where: { status: "dead" },
                order: [["createdAt", "DESC"]],
                limit: 50,
            });
            expect(result).toHaveLength(1);
            expect(result[0].messageId).toBe("msg-123");
        });

        it("should filter by user_id for non-admin", async () => {
            (DeadLetterMessage.findAll as jest.Mock).mockResolvedValue([]);

            await dlqService.getDlqMessages(10, false, 50);

            expect(DeadLetterMessage.findAll).toHaveBeenCalledWith({
                where: { status: "dead", user_id: 10 },
                order: [["createdAt", "DESC"]],
                limit: 50,
            });
        });
    });

    describe("retryDlqMessage", () => {
        it("should return false if message is not found", async () => {
            (DeadLetterMessage.findOne as jest.Mock).mockResolvedValue(null);

            const result = await dlqService.retryDlqMessage("msg-999", 10, true);

            expect(result).toBe(false);
        });

        it("should throw error if non-admin tries to retry another user's message", async () => {
            const mockRecord = {
                user_id: 20,
            };
            (DeadLetterMessage.findOne as jest.Mock).mockResolvedValue(mockRecord);

            await expect(dlqService.retryDlqMessage("msg-123", 10, false)).rejects.toThrow("403 Forbidden");
        });

        it("should retry message, publish event, update status, and emit notification", async () => {
            const mockRecord = {
                message_id: "msg-123",
                routing_key: "scan.process",
                user_id: 10,
                payload: { db_id: 5 },
                status: "dead",
                save: jest.fn().mockResolvedValue(true),
            };
            (DeadLetterMessage.findOne as jest.Mock).mockResolvedValue(mockRecord);
            (quotaService.checkAndDecrementQuota as jest.Mock).mockResolvedValue(true);
            (RabbitmqPublisher.publishEvent as jest.Mock).mockResolvedValue(true);

            const result = await dlqService.retryDlqMessage("msg-123", 10, false);

            expect(quotaService.checkAndDecrementQuota).toHaveBeenCalledWith(10);
            expect(Scan.update).toHaveBeenCalledWith({ prediction: "processing" }, { where: { id: 5 } });
            expect(RabbitmqPublisher.publishEvent).toHaveBeenCalledWith("scan.process", { db_id: 5 });
            expect(mockRecord.status).toBe("retried");
            expect(mockRecord.save).toHaveBeenCalled();
            expect(NotificationService.emitDlqUpdated).toHaveBeenCalledWith({
                action: "remove",
                data: { messageId: "msg-123", routingKey: "scan.process" },
            });
            expect(result).toBe(true);
        });
    });

    describe("retryAllDlqMessages", () => {
        it("should retry all eligible messages and return counts", async () => {
            const mockRecord1 = {
                message_id: "msg-1",
                routing_key: "scan.process",
                user_id: 10,
                payload: { db_id: 1 },
                status: "dead",
                save: jest.fn().mockResolvedValue(true),
            };
            (DeadLetterMessage.findAll as jest.Mock).mockResolvedValue([mockRecord1]);
            (quotaService.checkAndDecrementQuota as jest.Mock).mockResolvedValue(true);
            (RabbitmqPublisher.publishEvent as jest.Mock).mockResolvedValue(true);

            const result = await dlqService.retryAllDlqMessages(10, false);

            expect(result).toEqual({ successCount: 1, skippedCount: 0 });
            expect(NotificationService.emitDlqUpdated).toHaveBeenCalledWith({
                action: "bulk_retry",
                data: { successCount: 1, skippedCount: 0 },
            });
        });
    });

    describe("purgeDlq", () => {
        it("should update records to purged, purge rabbit channel, and emit notification", async () => {
            const mockChannel = {
                purgeQueue: jest.fn().mockResolvedValue(true),
            };
            (getRabbitChannel as jest.Mock).mockReturnValue(mockChannel);
            (DeadLetterMessage.update as jest.Mock).mockResolvedValue([1]);

            await dlqService.purgeDlq();

            expect(DeadLetterMessage.update).toHaveBeenCalledWith(
                { status: "purged" },
                { where: { status: "dead" } }
            );
            expect(mockChannel.purgeQueue).toHaveBeenCalledWith("payment_dead_letter_queue");
            expect(NotificationService.emitDlqUpdated).toHaveBeenCalledWith({
                action: "purge",
                data: {},
            });
        });
    });
});
