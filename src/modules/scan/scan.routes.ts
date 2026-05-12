import {Router} from 'express';
import {ScanController} from './scan.controller';
import {uploadMiddleware} from '../../middleware/upload';
import {requireAuth, requireRole} from '../../middleware/auth.guard';

const router = Router();


router.get('/history', ScanController.getScanHistory);
router.post('/', requireAuth, uploadMiddleware.single('image'), ScanController.scanImage);
router.delete('/:id', requireRole(['admin']), ScanController.deleteScan);

export default router;
