import {Router} from 'express';
import {PaymentController} from "./payment.controller";
import {requireAuth, requireRole} from "../../middleware/auth.guard";

const router = Router();

router.post('/checkout', requireAuth, PaymentController.createTransaction);
router.post('/webhook', PaymentController.handleWebhook);

router.get('/me', requireAuth, PaymentController.getCurrentUserPaymentHistories);
router.get('/kpi', requireAuth, PaymentController.getPaymentKpi);
router.get('/', requireAuth, requireRole(['admin']), PaymentController.getAll);
router.post('/', requireRole(['admin']), PaymentController.create);
router.get('/users/:user_id', requireRole(['admin']), PaymentController.getByUserId);
router.get('/orders/:order_id', PaymentController.getByOrderId);
router.get('/:id', PaymentController.getById);
router.put('/:id/status', requireRole(['admin']), PaymentController.updateStatus);
router.delete('/:id', requireRole(['admin']), PaymentController.delete);

export default router;