import express, {Application, Request, Response} from 'express';
import cors from 'cors';

// Import Routes
import authRoutes from './modules/auth/auth.routes';

const app: Application = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Daftarkan jalur API di sini
app.use('/api/auth', authRoutes);

app.get('/', (req: Request, res: Response) => {
    res.json({message: "Welcome to Ceramic AI API Gateway (TypeScript Version)"});
});

export default app;