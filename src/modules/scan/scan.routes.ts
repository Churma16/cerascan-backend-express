import {Router} from 'express';
import {ScanController} from './scan.controller';
import {uploadMiddleware} from '../../middleware/upload';
import {requireAuth, requireRole} from '../../middleware/auth.guard';

const router = Router();


router.get('/history', ScanController.getScanHistory);
router.post('/', uploadMiddleware.single('image'), ScanController.scanImage);
router.post('/batch', requireAuth, uploadMiddleware.array('images', 50), ScanController.batchScanImages);
router.delete('/:id', requireAuth, requireRole(['admin']), ScanController.deleteScan);

export default router;
