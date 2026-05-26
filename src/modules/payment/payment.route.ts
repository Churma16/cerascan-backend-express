import {Router} from 'express';
import {PaymentController} from "./payment.controller";
import {requireAuth} from "../../middleware/auth.guard";

const router = Router();

router.post('/checkout', requireAuth, PaymentController.createTransaction);
router.post('/webhook', PaymentController.handleWebhook);

export default router;