import express, { Application, Request, Response } from "express";
import cors from "cors";
import path from "path";

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import scanRoutes from "./routes/scan.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import dlqRoutes from "./routes/dlq.routes";
import paymentRoutes from "./routes/payment.routes";
import planRoutes from "./routes/plan.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import leaderboardRoutes from "./routes/leaderboard.routes";
import quotaRoutes from "./routes/quota.routes";
import modelInsightRoutes from "./routes/modelInsight.routes";
import sseRoutes from "./transport/sse/sse.routes";
import metricsRoutes from "./routes/metrics.routes";
import baselineRoutes from "./routes/baseline.routes";
import { metricsMiddleware } from "./middleware/metrics.middleware";
import passport from "passport";

const app: Application = express();

app.use(metricsMiddleware);

app.use(cors({
    origin: [
        "https://ceramic.churma.codes",
        "http://localhost:3000",
        "http://localhost:5173"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use(passport.initialize());
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/scans", scanRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/dlq", dlqRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/leaderboards", leaderboardRoutes);
app.use("/api/user-quotas", quotaRoutes);
app.use("/api/model-insights", modelInsightRoutes);
app.use("/api/sse", sseRoutes);
app.use("/api/baseline", baselineRoutes);
app.use("/metrics", metricsRoutes);

app.get("/", (req: Request, res: Response) => {
    res.json({ message: "Welcome to Ceramic AI API Gateway (TypeScript Version)" });
});

export default app;
