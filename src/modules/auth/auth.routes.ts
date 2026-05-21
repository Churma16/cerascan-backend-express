import {Router} from 'express';
import {AuthController} from './auth.controller';
import {requireAuth} from "../../middleware/auth.guard";
import {forgotPasswordLimiter} from "../../middleware/rate_limit";

const router = Router();
// router.use(requireAuth);

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/change-password', requireAuth, AuthController.changePassword);
router.post('/forgot-password', forgotPasswordLimiter, AuthController.forgotPassword);
router.post('/verify-otp', AuthController.verifyOtp);
router.post('/reset-password', AuthController.resetPassword);
router.post('/v2/register', AuthController.registerV2);
router.get('/verify-email', AuthController.verifyEmail);

export default router;