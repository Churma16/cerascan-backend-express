import {Router} from "express";
import {ModelInsightController} from "./model_insight.controller";

const router = Router();

router.get('/kpi', ModelInsightController.getModelInsightKPI);
router.get('/prediction-distribution', ModelInsightController.getPredictionDistribution);
router.get('/confidence-distribution', ModelInsightController.getConfidenceDistribution);

export default router;