import {Router} from "express";
import {requireAuth} from "../../middleware/auth.guard";
import {DashboardController} from "./dashboard.controller";
import {CacheMiddleware} from "../../middleware/cache";

const router = Router();

router.use(requireAuth);

router.get("/kpi", CacheMiddleware.checkCache('dashboard:kpi', false), DashboardController.getDashboardKpi);
router.get(
    "/scan-trends",
    CacheMiddleware.checkCache('dashboard:trend', false),
    DashboardController.getLatestScanDataTrend
);
router.get("/scan-history", DashboardController.getLatestScanData);

export default router;