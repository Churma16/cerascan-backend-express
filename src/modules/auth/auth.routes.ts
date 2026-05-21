import {Router} from 'express';
import {AuthController} from './auth.controller';
import {requireAuth} from "../../middleware/auth.guard";

const router = Router();
// router.use(requireAuth);

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/change-password', requireAuth, AuthController.changePassword);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/verify-otp', AuthController.verifyOtp);
router.post('/reset-password', AuthController.resetPassword);
export default router;