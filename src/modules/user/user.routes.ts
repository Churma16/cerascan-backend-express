import {Router} from "express";
import {UserController} from "./user.controller";
import {requireAuth, requireRole} from "../../middleware/auth.guard";

const router = Router();

router.use(requireAuth);

router.get("/", requireRole(['admin']), UserController.getAll);
router.get("/:id", UserController.getById);
router.put("/:id", requireRole(['admin']), UserController.update);
router.delete("/:id", requireRole(['admin']), UserController.delete);

export default router;