import {Router} from "express";
import {ScanController} from "./scan.controller";
import {uploadMiddleware} from "../../middleware/upload";

const router = Router();

router.get("/history", ScanController.getScanHistory)
router.post('/', uploadMiddleware.single('image'), ScanController.scanImage);

export default router;