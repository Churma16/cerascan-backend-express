import {Router} from "express";
import {requireAuth} from "../../middleware/auth.guard";
import {DashboardController} from "./dashboard.controller";

const router = Router();

router.use(requireAuth);

router.get("/kpi", DashboardController.getDashboardKpi);
router.get("/scan-trends", DashboardController.getLatestScanDataTrend);
router.get("/scan-history", DashboardController.getLatestScanData)
export default router;