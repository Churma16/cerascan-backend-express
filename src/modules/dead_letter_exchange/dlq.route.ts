import {Router} from "express";
import {requireAuth, requireRole} from "../../middleware/auth.guard";
import {DLQController} from "./dlq.controller";

const router = Router();

router.use(requireAuth);

router.get("/", DLQController.getDLQMessages);
router.post("/retry", DLQController.retryDLQMessage);
router.post("/retry-all", DLQController.retryAllDLQMessages);
router.delete("/purge", requireRole(['admin']), DLQController.purgeDLQ);

export default router;
