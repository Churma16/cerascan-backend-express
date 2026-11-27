import express from "express";
import request from "supertest";
import metricsRoutes from "./metrics.routes";

const testApp = express();
testApp.use("/metrics", metricsRoutes);

describe("GET /metrics", () => {
    it("should return 200 with Prometheus text format", async () => {
        const response = await request(testApp).get("/metrics");

        expect(response.status).toBe(200);
        expect(response.headers["content-type"]).toContain("text/plain");
        expect(response.text).toContain("cerascan_process_cpu_user_seconds_total");
        expect(response.text).toContain("http_request_duration_seconds");
        expect(response.text).toContain("http_requests_total");
        expect(response.text).toContain("active_sse_connections");
    });
});
