import { Router } from "express";
import { SubscriptionController } from "../controllers/subscription.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import {
    createSubscriptionSchema,
    updateSubscriptionSchema,
    subscriptionIdParamSchema,
    giveSubscriptionSchema
} from "../schemas/subscription.schema";
import { userIdParamSchema } from "../schemas/quota.schema";

const router = Router();
router.use(requireAuth);

router.post("/", requireRole(["admin"]), validate(createSubscriptionSchema), SubscriptionController.create);
router.get("/", SubscriptionController.getAll);
router.get("/me/active", SubscriptionController.getCurrentUserActivePlan);
router.get("/user/me", SubscriptionController.getCurrentUserSubscriptionHistory);
router.get("/user/:user_id", validate({ params: userIdParamSchema }), SubscriptionController.getByUserId);
router.post("/gift", validate(giveSubscriptionSchema), SubscriptionController.giveSubscription);
router.get("/:id", validate({ params: subscriptionIdParamSchema }), SubscriptionController.getById);
router.put(
    "/:id",
    requireRole(["admin"]),
    validate({ params: subscriptionIdParamSchema, body: updateSubscriptionSchema }),
    SubscriptionController.update
);
router.delete("/:id", requireRole(["admin"]), validate({ params: subscriptionIdParamSchema }), SubscriptionController.delete);

export default router;
