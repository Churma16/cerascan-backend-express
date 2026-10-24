import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { forgotPasswordLimiter } from "../middleware/rateLimit.middleware";
import { validate } from "../middleware/validate.middleware";
import {
    registerSchema,
    registerV2Schema,
    loginSchema,
    changePasswordSchema,
    forgotPasswordSchema,
    verifyOtpSchema,
    resetPasswordSchema,
    verifyEmailQuerySchema
} from "../schemas/auth.schema";
import passport from "passport";

const router = Router();

router.post("/register", validate(registerSchema), AuthController.register);
router.post("/v2/register", validate(registerV2Schema), AuthController.registerV2);
router.post("/login", validate(loginSchema), AuthController.login);
router.post("/change-password", requireAuth, validate(changePasswordSchema), AuthController.changePassword);
router.post("/forgot-password", forgotPasswordLimiter, validate(forgotPasswordSchema), AuthController.forgotPassword);
router.post("/verify-otp", validate(verifyOtpSchema), AuthController.verifyOtp);
router.post("/reset-password", validate(resetPasswordSchema), AuthController.resetPassword);
router.get("/verify-email", validate({ query: verifyEmailQuerySchema }), AuthController.verifyEmail);

router.get(
    "/google",
    passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

router.get(
    "/google/callback",
    passport.authenticate("google", { failureRedirect: "/login", session: false }),
    AuthController.googleCallback
);

export default router;
