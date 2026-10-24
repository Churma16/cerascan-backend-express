import { Router } from "express";
import { PaymentController } from "../controllers/payment.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import {
    createPaymentSchema,
    orderIdParamSchema,
    paymentIdParamSchema
} from "../schemas/payment.schema";
import { userIdParamSchema } from "../schemas/quota.schema";

const router = Router();

router.post("/checkout", requireAuth, validate(createPaymentSchema), PaymentController.createTransaction);
router.post("/webhook", PaymentController.handleWebhook);

router.get("/me", requireAuth, PaymentController.getCurrentUserPaymentHistories);
router.get("/kpi", requireAuth, PaymentController.getPaymentKpi);
router.get("/", requireAuth, requireRole(["admin"]), PaymentController.getAll);
router.post("/", requireRole(["admin"]), PaymentController.create);
router.get("/users/:user_id", requireRole(["admin"]), validate({ params: userIdParamSchema }), PaymentController.getByUserId);
router.get("/orders/:order_id", validate({ params: orderIdParamSchema }), PaymentController.getByOrderId);
router.get("/:id", validate({ params: paymentIdParamSchema }), PaymentController.getById);
router.put("/:id/status", requireRole(["admin"]), validate({ params: paymentIdParamSchema }), PaymentController.updateStatus);
router.delete("/:id", requireRole(["admin"]), validate({ params: paymentIdParamSchema }), PaymentController.delete);

export default router;
