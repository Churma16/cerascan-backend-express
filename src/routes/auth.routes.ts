import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { forgotPasswordLimiter } from "../middleware/rateLimit.middleware";
import passport from "passport";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/change-password", requireAuth, authController.changePassword);
router.post("/forgot-password", forgotPasswordLimiter, authController.forgotPassword);
router.post("/verify-otp", authController.verifyOtp);
router.post("/reset-password", authController.resetPassword);
router.post("/v2/register", authController.registerV2);
router.get("/verify-email", authController.verifyEmail);

router.get(
    "/google",
    passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

router.get(
    "/google/callback",
    passport.authenticate("google", { failureRedirect: "/login", session: false }),
    authController.googleCallback
);

export default router;
