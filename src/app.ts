import express, {Application, Request, Response} from 'express';
import cors from 'cors';
import path from 'path';

// Import Routes
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/user/user.routes';
import scanRoutes from './modules/scan/scan.routes';

const app: Application = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/scans', scanRoutes);


app.get('/', (req: Request, res: Response) => {
    res.json({message: "Welcome to Ceramic AI API Gateway (TypeScript Version)"});
});

export default app;