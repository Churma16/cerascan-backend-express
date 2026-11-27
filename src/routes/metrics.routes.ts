import { Router, Request, Response } from "express";
import { metricsRegistry } from "../config/metrics";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
    try {
        res.setHeader("Content-Type", metricsRegistry.contentType);
        const metrics = await metricsRegistry.metrics();
        res.send(metrics);
    } catch (error: any) {
        res.status(500).send(error.message);
    }
});

export default router;
