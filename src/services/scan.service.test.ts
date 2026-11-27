import { ScanService } from "./scan.service";
import { scanRepository } from "../repositories/scan.repository";
import { storageService } from "./storage.service";
import { RabbitmqPublisher } from "../transport/rabbitmq/infrastructure/rabbitmq.publisher";
import { quotaService } from "./quota.service";

jest.mock("../repositories/scan.repository", () => ({
    scanRepository: {
        create: jest.fn(),
        destroy: jest.fn(),
        findByPk: jest.fn(),
        findById: jest.fn(),
        findAndCountAll: jest.fn(),
        findAll: jest.fn(),
        update: jest.fn(),
        recordAnalytics: jest.fn(),
        incrementScanKpi: jest.fn(),
    },
}));
jest.mock("./storage.service", () => ({
    storageService: {
        uploadFile: jest.fn(),
        downloadFile: jest.fn(),
        getPresignedUrl: jest.fn(),
        deleteFile: jest.fn(),
    },
}));
jest.mock("../transport/rabbitmq/infrastructure/rabbitmq.publisher", () => ({
    RabbitmqPublisher: {
        publishEvent: jest.fn(),
    },
}));
jest.mock("./quota.service", () => ({
    quotaService: {
        checkAndDecrementQuota: jest.fn(),
        refundUserQuota: jest.fn(),
    },
}));

describe("ScanService - Quota Deduction in initiateSingleScan", () => {
    let scanService: ScanService;

    beforeEach(() => {
        jest.clearAllMocks();
        scanService = new ScanService(scanRepository as any);
    });

    it("should check and decrement quota, then upload and publish scan when user has quota", async () => {
        (quotaService.checkAndDecrementQuota as jest.Mock).mockResolvedValue(true);
        (storageService.uploadFile as jest.Mock).mockResolvedValue("scans-dev/test-key.jpg");
        (scanRepository.create as jest.Mock).mockResolvedValue({
            id: 1,
            scan_id: "#SCN-12345",
            file_name: "test.jpg",
            saved_file_name: "scans-dev/test-key.jpg",
            user_id: 10,
        });

        const mockFile = {
            buffer: Buffer.from("test-content"),
            originalname: "test.jpg",
            mimetype: "image/jpeg",
        } as Express.Multer.File;

        const result = await scanService.initiateSingleScan({
            userId: 10,
            file: mockFile,
        });

        expect(quotaService.checkAndDecrementQuota).toHaveBeenCalledWith(10, 1);
        expect(storageService.uploadFile).toHaveBeenCalled();
        expect(scanRepository.create).toHaveBeenCalled();
        expect(RabbitmqPublisher.publishEvent).toHaveBeenCalledWith(
            "scan.process",
            expect.objectContaining({
                db_id: 1,
                user_id: 10,
            })
        );
        expect(result.id).toBe(1);
    });

    it("should throw error Kuota scan Anda telah habis when checkAndDecrementQuota returns false", async () => {
        (quotaService.checkAndDecrementQuota as jest.Mock).mockResolvedValue(false);

        const mockFile = {
            buffer: Buffer.from("test-content"),
            originalname: "test.jpg",
            mimetype: "image/jpeg",
        } as Express.Multer.File;

        await expect(
            scanService.initiateSingleScan({
                userId: 10,
                file: mockFile,
            })
        ).rejects.toThrow("Kuota scan Anda telah habis");

        expect(quotaService.checkAndDecrementQuota).toHaveBeenCalledWith(10, 1);
        expect(storageService.uploadFile).not.toHaveBeenCalled();
        expect(scanRepository.create).not.toHaveBeenCalled();
        expect(RabbitmqPublisher.publishEvent).not.toHaveBeenCalled();
    });

    it("should skip quota deduction if userId is undefined (guest scan)", async () => {
        (storageService.uploadFile as jest.Mock).mockResolvedValue("scans-dev/test-key.jpg");
        (scanRepository.create as jest.Mock).mockResolvedValue({
            id: 2,
            scan_id: "#SCN-guest",
            file_name: "guest.jpg",
            saved_file_name: "scans-dev/test-key.jpg",
            user_id: undefined,
        });

        const mockFile = {
            buffer: Buffer.from("guest-content"),
            originalname: "guest.jpg",
            mimetype: "image/jpeg",
        } as Express.Multer.File;

        const result = await scanService.initiateSingleScan({
            userId: undefined,
            file: mockFile,
        });

        expect(quotaService.checkAndDecrementQuota).not.toHaveBeenCalled();
        expect(storageService.uploadFile).toHaveBeenCalled();
        expect(result.id).toBe(2);
    });
});

describe("ScanService - deleteScanById (Issue #23)", () => {
    let scanService: ScanService;

    beforeEach(() => {
        jest.clearAllMocks();
        scanService = new ScanService(scanRepository as any);
    });

    it("should return false if scan record does not exist", async () => {
        (scanRepository.findById as jest.Mock).mockResolvedValue(null);

        const result = await scanService.deleteScanById(999);

        expect(result).toBe(false);
        expect(scanRepository.findById).toHaveBeenCalledWith(999);
        expect(storageService.deleteFile).not.toHaveBeenCalled();
        expect(scanRepository.destroy).not.toHaveBeenCalled();
    });

    it("should delete file from storage before destroying DB record when saved_file_name exists", async () => {
        (scanRepository.findById as jest.Mock).mockResolvedValue({
            id: 123,
            saved_file_name: "scans-dev/test-image.jpg",
        });
        (storageService.deleteFile as jest.Mock).mockResolvedValue(undefined);
        (scanRepository.destroy as jest.Mock).mockResolvedValue(true);

        const result = await scanService.deleteScanById(123);

        expect(result).toBe(true);
        expect(scanRepository.findById).toHaveBeenCalledWith(123);
        expect(storageService.deleteFile).toHaveBeenCalledWith("scans-dev/test-image.jpg");
        expect(scanRepository.destroy).toHaveBeenCalledWith(123);
    });

    it("should still destroy DB record even if storage deletion fails", async () => {
        (scanRepository.findById as jest.Mock).mockResolvedValue({
            id: 124,
            saved_file_name: "scans-dev/missing-image.jpg",
        });
        (storageService.deleteFile as jest.Mock).mockRejectedValue(new Error("R2 error"));
        (scanRepository.destroy as jest.Mock).mockResolvedValue(true);

        const result = await scanService.deleteScanById(124);

        expect(result).toBe(true);
        expect(scanRepository.destroy).toHaveBeenCalledWith(124);
    });
});
