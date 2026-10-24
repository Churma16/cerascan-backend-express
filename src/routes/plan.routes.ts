import { Router } from "express";
import { PlanController } from "../controllers/plan.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import {
    createPlanSchema,
    updatePlanSchema,
    planIdParamSchema,
    adjustedPriceParamSchema
} from "../schemas/plan.schema";

const router = Router();
router.use(requireAuth);

router.post("/", requireRole(["admin"]), validate(createPlanSchema), PlanController.create);
router.get("/", PlanController.getAll);
router.get("/:id", validate({ params: planIdParamSchema }), PlanController.getById);
router.put(
    "/:id",
    requireRole(["admin"]),
    validate({ params: planIdParamSchema, body: updatePlanSchema }),
    PlanController.update
);
router.delete("/:id", requireRole(["admin"]), validate({ params: planIdParamSchema }), PlanController.delete);
router.get(
    "/adjusted-price/:planId",
    validate({ params: adjustedPriceParamSchema }),
    PlanController.getSelectedAdjustedPlanPrice
);

export default router;
