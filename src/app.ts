import express, {Application, Request, Response} from 'express';
import cors from 'cors';
import path from 'path';

// Import Routes
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/user/user.routes';
import scanRoutes from './modules/scan/scan.routes';
import dashboardRoute from "./modules/dashboard/dashboard.route";
import paymentRoute from "./modules/payment/payment.route";
import planRoute from "./modules/plan/plan.route";
import subscriptionRoute from "./modules/subscription/subscription.route";

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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/scans', scanRoutes);
app.use('/api/dashboard', dashboardRoute);
app.use('/api/payment', paymentRoute);
app.use('/api/plans', planRoute);
app.use('/api/subscriptions', subscriptionRoute);


app.get('/', (req: Request, res: Response) => {
    res.json({message: "Welcome to Ceramic AI API Gateway (TypeScript Version)"});
});

export default app;