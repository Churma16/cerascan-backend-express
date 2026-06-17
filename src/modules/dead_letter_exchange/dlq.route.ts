import {Router} from "express";
import {requireAuth, requireRole} from "../../middleware/auth.guard";
import {DLQController} from "./dlq.controller";

const router = Router();

router.use(requireAuth);
router.use(requireRole(['admin']));

router.get("/", DLQController.getDLQMessages);
router.post("/retry", DLQController.retryDLQMessage);
router.delete("/purge", DLQController.purgeDLQ);

export default router;
