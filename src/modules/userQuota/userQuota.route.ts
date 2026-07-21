import {Router} from "express";
import {requireAuth} from '../../middleware/auth.middleware';
import {UserQuotaController} from './userQuota.controller';

const router = Router();
router.use(requireAuth);

router.post("/", UserQuotaController.create);
router.get("/:user_id", UserQuotaController.getByUserId);
router.put("/:user_id", UserQuotaController.updateQuota);
router.post("/:user_id/increment", UserQuotaController.incrementUsedQuota);
router.post("/:user_id/reset", UserQuotaController.resetQuota);

export default router;

