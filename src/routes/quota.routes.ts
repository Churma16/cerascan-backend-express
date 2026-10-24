import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { QuotaController } from "../controllers/quota.controller";

const router = Router();
router.use(requireAuth);

router.post("/", QuotaController.create);
router.get("/:user_id", QuotaController.getByUserId);
router.put("/:user_id", QuotaController.updateQuota);
router.post("/:user_id/increment", QuotaController.incrementUsedQuota);
router.post("/:user_id/reset", QuotaController.resetQuota);

export default router;
