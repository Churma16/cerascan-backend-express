import { Router } from "express";
import { BaselineController } from "../controllers/baseline.controller";
import { uploadMiddleware } from "../middleware/upload.middleware";

const router = Router();

// Baseline 01: Direct Synchronous Scan (RabbitMQ Alternative)
router.post("/scans/sync", uploadMiddleware.single("image"), BaselineController.syncScanImage);

// Baseline 02: Direct Heavy Database Query (Redis Cache Bypass)
router.get("/dashboard/no-cache", BaselineController.getDashboardNoCache);

// Baseline 03: Polling Status (SSE Alternative)
router.get("/scans/poll-status", BaselineController.pollScanStatus);
router.get("/scans/poll-status/:scanId", BaselineController.pollScanStatus);

// Benchmark 04: Pure gRPC HTTP/2 vs REST HTTP/1.1 Inference
router.post("/scans/grpc-inference", uploadMiddleware.single("image"), BaselineController.grpcInferenceScan);
router.post("/scans/rest-inference", uploadMiddleware.single("image"), BaselineController.restInferenceScan);

// Baseline 05: Local Disk File Storage (Cloudflare R2 Alternative)
router.post("/scans/local-disk", uploadMiddleware.single("image"), BaselineController.localDiskScan);

// Baseline 06: Monolithic Database Queries (CQRS & Polyglot Alternative)
router.get("/dashboard/monolith", BaselineController.getDashboardMonolith);

// Baseline 07: Fail-and-Forget Error Handling (Dead Letter Queue Alternative)
router.post("/scans/fail-and-forget", BaselineController.failAndForgetScan);

// Baseline 08: Single Scan for Client Looping Benchmark (Batch Alternative)
router.post("/scans/single-loop", uploadMiddleware.single("image"), BaselineController.singleLoopScan);

export default router;
