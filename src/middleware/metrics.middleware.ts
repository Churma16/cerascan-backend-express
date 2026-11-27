import { Request, Response, NextFunction } from "express";
import { httpRequestDurationSeconds, httpRequestsTotal } from "../config/metrics";

export function normalizeRoute(req: Request): string {
    if (req.route && req.route.path) {
        return `${req.baseUrl || ""}${req.route.path}`;
    }

    const rawPath = req.originalUrl?.split("?")[0] || req.path || "unknown";
    return rawPath
        .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id")
        .replace(/\/\d+(?=\/|$)/g, "/:id");
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
    if (req.path === "/metrics" || req.originalUrl === "/metrics") {
        return next();
    }

    const start = process.hrtime();

    res.on("finish", () => {
        const diff = process.hrtime(start);
        const durationSeconds = diff[0] + diff[1] / 1e9;
        const route = normalizeRoute(req);

        const labels = {
            method: req.method,
            route,
            status_code: String(res.statusCode),
        };

        httpRequestDurationSeconds.observe(labels, durationSeconds);
        httpRequestsTotal.inc(labels);
    });

    next();
}
