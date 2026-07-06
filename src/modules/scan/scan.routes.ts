import {Router} from 'express';
import {ScanController} from './scan.controller';
import {uploadMiddleware} from '../../middleware/upload';
import {requireAuth, requireRole} from '../../middleware/auth.guard';
import {invalidateTrendCache} from "../../middleware/cacheInvalidation";

const router = Router();


router.get('/history', requireAuth, ScanController.getScanHistory);
router.get('/history/public', ScanController.getPublicScanHistory);
router.post('/', uploadMiddleware.single('image'), invalidateTrendCache, ScanController.scanImage);
router.post(
    '/batch',
    requireAuth,
    uploadMiddleware.array('images', 50),
    invalidateTrendCache,
    ScanController.batchScanImages
);
router.delete('/:id', requireAuth, invalidateTrendCache, requireRole(['admin']), ScanController.deleteScan);

export default router;
