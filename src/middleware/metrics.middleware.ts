import { Request, Response, NextFunction } from "express";
import { httpRequestDurationSeconds, httpRequestsTotal } from "../config/metrics";

export function normalizeRoute(req: Request): string {
    if (req.route && req.route.path) {
        return `${req.baseUrl || ""}${req.route.path}`;
    }

    const path = req.originalUrl?.split("?")[0] || req.path || "";
    if (path.startsWith("/uploads")) {
        return "/uploads/:file";
    }

    return "unmatched";
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
    const url = req.originalUrl || req.url || "";
    if (url.startsWith("/metrics") || url.startsWith("/api/sse")) {
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
