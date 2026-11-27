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

        it("should sanitize numeric IDs from unmatched path", () => {
            const req = {
                originalUrl: "/api/scans/42/details",
            } as unknown as Request;

            expect(normalizeRoute(req)).toBe("/api/scans/:id/details");
        });

        it("should sanitize UUIDs from unmatched path", () => {
            const req = {
                originalUrl: "/api/items/123e4567-e89b-12d3-a456-426614174000",
            } as unknown as Request;

            expect(normalizeRoute(req)).toBe("/api/items/:id");
        });
    });

    describe("metricsMiddleware", () => {
        it("should skip metrics collection for /metrics", () => {
            const req = { path: "/metrics" } as Request;
            const res = {} as Response;
            const next = jest.fn();

            metricsMiddleware(req, res, next);
            expect(next).toHaveBeenCalledTimes(1);
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
