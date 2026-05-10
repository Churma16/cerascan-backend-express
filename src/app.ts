import express, {Application, Request, Response} from 'express';
import cors from 'cors';

const app: Application = express();

// Middleware Global
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Rute Test Dasar
app.get('/', (req: Request, res: Response) => {
    res.json({message: "Welcome to Ceramik AI API Gateway (TypeScript Version)"});
});

export default app;