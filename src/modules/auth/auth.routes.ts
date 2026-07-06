import {Router} from 'express';
import {AuthController} from './auth.controller';
import {requireAuth} from "../../middleware/auth.guard";
import {forgotPasswordLimiter} from "../../middleware/rate_limit";
import passport from "passport";

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/change-password', requireAuth, AuthController.changePassword);
router.post('/forgot-password', forgotPasswordLimiter, AuthController.forgotPassword);
router.post('/verify-otp', AuthController.verifyOtp);
router.post('/reset-password', AuthController.resetPassword);
router.post('/v2/register', AuthController.registerV2);
router.get('/verify-email', AuthController.verifyEmail);
router.get(
    '/google',
    passport.authenticate('google', {scope: ['profile', 'email'], session: false})
);

router.get(
    '/google/callback',
    passport.authenticate('google', {failureRedirect: '/login', session: false}),
    AuthController.googleCallback
);

export default router;