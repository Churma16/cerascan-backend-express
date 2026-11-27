import client from "prom-client";

export const metricsRegistry = new client.Registry();

client.collectDefaultMetrics({
    register: metricsRegistry,
    prefix: "cerascan_",
});

export const httpRequestDurationSeconds = new client.Histogram({
    name: "http_request_duration_seconds",
    help: "Duration of HTTP requests in seconds",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [metricsRegistry],
});

export const httpRequestsTotal = new client.Counter({
    name: "http_requests_total",
    help: "Total number of HTTP requests processed",
    labelNames: ["method", "route", "status_code"],
    registers: [metricsRegistry],
});

export const activeSseConnections = new client.Gauge({
    name: "active_sse_connections",
    help: "Current number of active Server-Sent Events (SSE) connections",
    registers: [metricsRegistry],
});
