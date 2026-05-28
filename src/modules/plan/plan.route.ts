import {Router} from "express";
import {requireAuth, requireRole} from "../../middleware/auth.guard";
import {PlanController} from "./plan.controller";

const router = Router();
router.use(requireAuth);

router.post("/", requireRole(['admin']), PlanController.create);
router.get("/", PlanController.getAll);
router.get("/:id", PlanController.getById);
router.put("/:id", requireRole(['admin']), PlanController.update);
router.delete("/:id", requireRole(['admin']), PlanController.delete);

export default router;
