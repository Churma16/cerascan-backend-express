import { Router } from "express";
import { QuotaController } from "../controllers/quota.controller";
import { validate } from "../middleware/validate.middleware";
import {
    userIdParamSchema,
    createQuotaSchema,
    updateQuotaSchema,
    incrementQuotaSchema
} from "../schemas/quota.schema";

const router = Router();

router.post("/", validate(createQuotaSchema), QuotaController.create);
router.get("/:user_id", validate({ params: userIdParamSchema }), QuotaController.getByUserId);
router.put(
    "/:user_id",
    validate({ params: userIdParamSchema, body: updateQuotaSchema }),
    QuotaController.updateQuota
);
router.post(
    "/:user_id/increment",
    validate({ params: userIdParamSchema, body: incrementQuotaSchema }),
    QuotaController.incrementUsedQuota
);
router.post("/:user_id/reset", validate({ params: userIdParamSchema }), QuotaController.resetQuota);

export default router;
