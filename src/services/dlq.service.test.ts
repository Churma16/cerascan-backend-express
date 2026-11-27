import { DlqService } from "./dlq.service";
import { dlqRepository } from "../repositories/dlq.repository";
import { scanRepository } from "../repositories/scan.repository";
import { RabbitmqPublisher } from "../transport/rabbitmq/infrastructure/rabbitmq.publisher";
import { quotaService } from "./quota.service";
import { NotificationService } from "./notification.service";
import { getRabbitChannel } from "../config/rabbitmqClient";

jest.mock("../repositories/dlq.repository", () => ({
    dlqRepository: {
        findDeadMessages: jest.fn(),
        findDeadMessageByIdOrMessageId: jest.fn(),
        updateStatus: jest.fn(),
        purgeAllDead: jest.fn(),
        save: jest.fn(),
    },
}));
jest.mock("../repositories/scan.repository", () => ({
    scanRepository: {
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
            (dlqRepository.findDeadMessages as jest.Mock).mockResolvedValue([mockRecord]);

            const result = await dlqService.getDlqMessages(10, true, 50);

            expect(dlqRepository.findDeadMessages).toHaveBeenCalledWith({
                userId: undefined,
                limit: 50,
                order: "DESC",
            });
            expect(result).toHaveLength(1);
            expect(result[0].messageId).toBe("msg-123");
        });

        it("should filter by user_id for non-admin", async () => {
            (dlqRepository.findDeadMessages as jest.Mock).mockResolvedValue([]);

            await dlqService.getDlqMessages(10, false, 50);

            expect(dlqRepository.findDeadMessages).toHaveBeenCalledWith({
                userId: 10,
                limit: 50,
                order: "DESC",
            });
        });
    });

    describe("retryDlqMessage", () => {
        it("should return false if message is not found", async () => {
            (dlqRepository.findDeadMessageByIdOrMessageId as jest.Mock).mockResolvedValue(null);

            const result = await dlqService.retryDlqMessage("msg-999", 10, true);

            expect(result).toBe(false);
        });

        it("should throw error if non-admin tries to retry another user's message", async () => {
            const mockRecord = {
                user_id: 20,
            };
            (dlqRepository.findDeadMessageByIdOrMessageId as jest.Mock).mockResolvedValue(mockRecord);

            await expect(dlqService.retryDlqMessage("msg-123", 10, false)).rejects.toThrow("403 Forbidden");
        });

        it("should retry message, publish event, update status, and emit notification", async () => {
            const mockRecord = {
                message_id: "msg-123",
                routing_key: "scan.process",
                user_id: 10,
                payload: { db_id: 5 },
                status: "dead",
            };
            (dlqRepository.findDeadMessageByIdOrMessageId as jest.Mock).mockResolvedValue(mockRecord);
            (dlqRepository.save as jest.Mock).mockResolvedValue(mockRecord);
            (scanRepository.update as jest.Mock).mockResolvedValue(1);
            (quotaService.checkAndDecrementQuota as jest.Mock).mockResolvedValue(true);
            (RabbitmqPublisher.publishEvent as jest.Mock).mockResolvedValue(true);

            const result = await dlqService.retryDlqMessage("msg-123", 10, false);

            expect(quotaService.checkAndDecrementQuota).toHaveBeenCalledWith(10);
            expect(scanRepository.update).toHaveBeenCalledWith(5, { prediction: "processing" });
            expect(RabbitmqPublisher.publishEvent).toHaveBeenCalledWith("scan.process", { db_id: 5 });
            expect(mockRecord.status).toBe("retried");
            expect(dlqRepository.save).toHaveBeenCalledWith(mockRecord);
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
            };
            (dlqRepository.findDeadMessages as jest.Mock).mockResolvedValue([mockRecord1]);
            (dlqRepository.save as jest.Mock).mockResolvedValue(mockRecord1);
            (scanRepository.update as jest.Mock).mockResolvedValue(1);
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
            (dlqRepository.purgeAllDead as jest.Mock).mockResolvedValue(1);

            await dlqService.purgeDlq();

            expect(dlqRepository.purgeAllDead).toHaveBeenCalled();
            expect(mockChannel.purgeQueue).toHaveBeenCalledWith("payment_dead_letter_queue");
            expect(NotificationService.emitDlqUpdated).toHaveBeenCalledWith({
                action: "purge",
                data: {},
            });
        });
    });
});
