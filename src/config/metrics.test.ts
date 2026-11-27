import { metricsRegistry, httpRequestDurationSeconds, httpRequestsTotal, activeSseConnections } from "./metrics";

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

    it("should increment and decrement active_sse_connections", async () => {
        const initialValue = (await activeSseConnections.get()).values[0]?.value || 0;

        activeSseConnections.inc();
        let current = (await activeSseConnections.get()).values[0]?.value;
        expect(current).toBe(initialValue + 1);

        activeSseConnections.dec();
        current = (await activeSseConnections.get()).values[0]?.value;
        expect(current).toBe(initialValue);
    });
});
