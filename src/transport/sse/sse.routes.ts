import { Router } from 'express';
import { handleSSEConnection } from './sse.controller';

const router = Router();

router.get('/events', handleSSEConnection);

export default router;
