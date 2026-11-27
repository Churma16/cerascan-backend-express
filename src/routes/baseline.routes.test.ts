import express from "express";
import request from "supertest";
import baselineRoutes from "./baseline.routes";

const testApp = express();
testApp.use(express.json());
testApp.use("/api/baseline", baselineRoutes);

describe("Baseline Routes Tests", () => {
    describe("POST /api/baseline/scans/sync", () => {
        it("should return 400 if no image file is uploaded", async () => {
            const response = await request(testApp).post("/api/baseline/scans/sync");

            expect(response.status).toBe(400);
            expect(response.body.meta.message).toContain("Tidak ada file gambar");
        });
    });

    describe("GET /api/baseline/scans/poll-status", () => {
        it("should return 400 when scanId parameter is missing", async () => {
            const response = await request(testApp).get("/api/baseline/scans/poll-status");

            expect(response.status).toBe(400);
            expect(response.body.meta.message).toContain("scanId wajib disertakan");
        });
    });

    describe("POST /api/baseline/scans/fail-and-forget", () => {
        it("should simulate fatal worker crash returning status 500", async () => {
            const response = await request(testApp).post("/api/baseline/scans/fail-and-forget");

            expect(response.status).toBe(500);
            expect(response.body.meta.message).toContain("Simulasi Fatal Worker Error");
        });
    });

    describe("POST /api/baseline/scans/single-loop", () => {
        it("should return 400 if no file is attached", async () => {
            const response = await request(testApp).post("/api/baseline/scans/single-loop");

            expect(response.status).toBe(400);
        });

        it("should return 200 with file metadata when valid image is provided", async () => {
            const dummyBuffer = Buffer.from("dummy image content");
            const response = await request(testApp)
                .post("/api/baseline/scans/single-loop")
                .attach("image", dummyBuffer, "loop_tile.png");

            expect(response.status).toBe(200);
            expect(response.body.data.received_filename).toBe("loop_tile.png");
        });
    });

    describe("POST /api/baseline/scans/local-disk", () => {
        it("should return 400 if no file is provided", async () => {
            const response = await request(testApp).post("/api/baseline/scans/local-disk");

            expect(response.status).toBe(400);
        });

        it("should return 201 and record storage_type as local_disk", async () => {
            const dummyBuffer = Buffer.from("sample binary data for local disk");
            const response = await request(testApp)
                .post("/api/baseline/scans/local-disk")
                .attach("image", dummyBuffer, "unit_test_tile.png");

            expect(response.status).toBe(201);
            expect(response.body.data.storage_type).toBe("local_disk");
            expect(response.body.data.file_name).toContain("local_");
        });
    });
});
