import { metricsRegistry, httpRequestDurationSeconds, activeSseConnections } from "./metrics";
import { sseClient } from "./sseClient";
import { Response } from "express";

describe("Prometheus Metrics Config", () => {
    it("should register default cerascan metrics", async () => {
        const metrics = await metricsRegistry.getMetricsAsJSON();
        const metricNames = metrics.map((m) => m.name);

        expect(metricNames).toContain("cerascan_process_cpu_user_seconds_total");
        expect(metricNames).toContain("http_request_duration_seconds");
        expect(metricNames).toContain("http_requests_total");
        expect(metricNames).toContain("active_sse_connections");
    });

    it("should observe http_request_duration_seconds", async () => {
        httpRequestDurationSeconds.observe(
            { method: "GET", route: "/api/test", status_code: "200" },
            0.125
        );

        const metrics = await metricsRegistry.getMetricsAsJSON();
        const durationMetric = metrics.find((m) => m.name === "http_request_duration_seconds");
        expect(durationMetric).toBeDefined();
    });

    it("should dynamically collect active_sse_connections from sseClient", async () => {
        const mockRes = {} as Response;
        sseClient.addClient("test-user-1", mockRes);

        const currentVal = (await activeSseConnections.get()).values[0]?.value;
        expect(currentVal).toBeGreaterThanOrEqual(1);

        sseClient.removeClient("test-user-1", mockRes);
    });
});
