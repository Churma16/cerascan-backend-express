import { Router } from "express";
import { ScanController } from "../controllers/scan.controller";
import { uploadMiddleware } from "../middleware/upload.middleware";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { invalidateTrendCache } from "../middleware/cacheInvalidation.middleware";
import { validate } from "../middleware/validate.middleware";
import { paginationQuerySchema, scanIdParamSchema } from "../schemas/scan.schema";

const router = Router();

router.get("/history", requireAuth, validate({ query: paginationQuerySchema }), ScanController.getScanHistory);
router.get("/history/public", validate({ query: paginationQuerySchema }), ScanController.getPublicScanHistory);
router.post("/", uploadMiddleware.single("image"), invalidateTrendCache, ScanController.scanImage);
router.post(
    "/batch",
    requireAuth,
    uploadMiddleware.array("images", 50),
    invalidateTrendCache,
    ScanController.batchScanImages
);
router.delete("/:id", requireAuth, invalidateTrendCache, requireRole(["admin"]), validate({ params: scanIdParamSchema }), ScanController.deleteScan);

export default router;
