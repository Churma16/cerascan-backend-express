import express, {Application, Request, Response} from 'express';
import cors from 'cors';
import path from 'path';

import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/user/user.routes';
import scanRoutes from './modules/scan/scan.routes';
import dashboardRoute from "./modules/dashboard/dashboard.route";
import dlqRoute from './modules/deadLetterExchange/dlq.route';
import paymentRoute from "./modules/payment/payment.route";
import planRoute from "./modules/plan/plan.route";
import subscriptionRoute from "./modules/subscription/subscription.route";
import leaderboardRoute from "./modules/leaderboard/leaderboard.route";
import userQuotaRoute from './modules/userQuota/userQuota.route';
import modelInsightRoute from './modules/modelInsight/modelInsight.route';
import sseRoute from "./modules/sse/sse.route";
import passport from "passport";

const app: Application = express();

app.use(cors({
    origin: [
        'https://ceramic.churma.codes',
        'http://localhost:3000',
        'http://localhost:5173'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use(passport.initialize());
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/scans', scanRoutes);
app.use('/api/dashboard', dashboardRoute);
app.use('/api/dlq', dlqRoute);
app.use('/api/payment', paymentRoute);
app.use('/api/plans', planRoute);
app.use('/api/subscriptions', subscriptionRoute);
app.use('/api/leaderboards', leaderboardRoute);
app.use('/api/user-quotas', userQuotaRoute);
app.use('/api/model-insights', modelInsightRoute);
app.use('/api/sse', sseRoute);


app.get('/', (req: Request, res: Response) => {
    res.json({message: "Welcome to Ceramic AI API Gateway (TypeScript Version)"});
});

export default app;