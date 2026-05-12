import {Router} from "express";
import {requireAuth, requireRole} from "../../middleware/auth.guard";
import {DashboardController} from "./dashboard.controller";

const router = Router();

router.use(requireAuth);

router.get("/kpi", requireRole(['admin']), DashboardController.getDashboardKpi);
router.get("/scan-trends", requireRole(['admin']), DashboardController.getLatestScanDataTrend);
router.get("/scan-history", requireRole(['admin']), DashboardController.getLatestScanData)
export default router;