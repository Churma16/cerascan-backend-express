import {Router} from 'express';
import {PaymentController} from "./payment.controller";
import {requireAuth, requireRole} from "../../middleware/auth.guard";

const router = Router();

// Midtrans integration routes
router.post('/checkout', requireAuth, PaymentController.createTransaction);
router.post('/webhook', PaymentController.handleWebhook);

// CRUD Payment Records routes
router.post('/records', requireRole(['admin']), PaymentController.create);
router.get('/records', requireRole(['admin']), PaymentController.getAll);
router.get('/records/:id', PaymentController.getById);
router.get('/order/:order_id', PaymentController.getByOrderId);
router.get('/user/:user_id', PaymentController.getByUserId);
router.put('/records/:id/status', requireRole(['admin']), PaymentController.updateStatus);
router.delete('/records/:id', requireRole(['admin']), PaymentController.delete);

export default router;