import {Router} from "express";
import {requireAuth, requireRole} from "../../middleware/auth.guard";
import {SubscriptionController} from "./subscription.controller";

const router = Router();
router.use(requireAuth);

router.post("/", requireRole(['admin']), SubscriptionController.create);
router.get("/", SubscriptionController.getAll);
router.get("/:id", SubscriptionController.getById);
router.get("/user/:user_id", SubscriptionController.getByUserId);
router.put("/:id", requireRole(['admin']), SubscriptionController.update);
router.delete("/:id", requireRole(['admin']), SubscriptionController.delete);

export default router;

