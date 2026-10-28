import {Router} from "express";
import {requireAuth} from '../../middleware/auth.middleware';
import {DashboardController} from "./dashboard.controller";
import {CacheMiddleware} from '../../middleware/cache.middleware';

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