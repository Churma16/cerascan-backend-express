import { Request, Response } from "express";
import { normalizeRoute, metricsMiddleware } from "./metrics.middleware";
import { httpRequestDurationSeconds, httpRequestsTotal } from "../config/metrics";

describe("Metrics Middleware", () => {
    describe("normalizeRoute", () => {
        it("should return baseUrl + route.path when req.route exists", () => {
            const req = {
                baseUrl: "/api/users",
                route: { path: "/:id" },
            } as unknown as Request;

            expect(normalizeRoute(req)).toBe("/api/users/:id");
        });

        it("should normalize static upload paths to /uploads/:file", () => {
            const req = {
                originalUrl: "/uploads/scans/V1StGXR8_Z5jdHi6B.png",
            } as unknown as Request;

            expect(normalizeRoute(req)).toBe("/uploads/:file");
        });

        it("should return 'unmatched' for arbitrary non-matched routes to avoid cardinality explosion", () => {
            const req = {
                originalUrl: "/wp-login.php?param=evil",
            } as unknown as Request;

            expect(normalizeRoute(req)).toBe("unmatched");
        });
    });

    describe("metricsMiddleware", () => {
        it("should skip metrics collection for /metrics and /api/sse", () => {
            const reqMetrics = { originalUrl: "/metrics?format=prometheus" } as Request;
            const reqSSE = { originalUrl: "/api/sse/events" } as Request;
            const res = {} as Response;
            const next = jest.fn();

            metricsMiddleware(reqMetrics, res, next);
            metricsMiddleware(reqSSE, res, next);

            expect(next).toHaveBeenCalledTimes(2);
        });

        it("should attach listener on res.finish and record metrics", () => {
            let finishHandler: () => void = () => {};
            const req = {
                method: "POST",
                path: "/api/auth/login",
                baseUrl: "/api/auth",
                route: { path: "/login" },
            } as unknown as Request;

            const res = {
                statusCode: 200,
                on: jest.fn((event, handler) => {
                    if (event === "finish") finishHandler = handler;
                }),
            } as unknown as Response;

            const next = jest.fn();

            const observeSpy = jest.spyOn(httpRequestDurationSeconds, "observe");
            const incSpy = jest.spyOn(httpRequestsTotal, "inc");

            metricsMiddleware(req, res, next);
            expect(next).toHaveBeenCalled();

            finishHandler();

            expect(observeSpy).toHaveBeenCalledWith(
                { method: "POST", route: "/api/auth/login", status_code: "200" },
                expect.any(Number)
            );
            expect(incSpy).toHaveBeenCalledWith({
                method: "POST",
                route: "/api/auth/login",
                status_code: "200",
            });
        });
    });
});
