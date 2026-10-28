# CeraScan: Express API Gateway

[![Express](https://img.shields.io/badge/Express-v5.x-000000?logo=express&logoColor=white)](https://expressjs.com)
[![Node](https://img.shields.io/badge/Node.js-%5E18.x-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

The Node.js API gateway for CeraScan. It manages user authentication, stores scan records, handles tile photo uploads, and sends inference requests to the Python ML service via gRPC.

---

## Capabilities

* **Client API Gateway**: Central HTTP entry point for the React frontend on port 5002.
* **Authentication**: Google OAuth 2.0 and JWT token verification.
* **gRPC Client**: Sends tile images to `backend-python` on port 50051 for defect prediction.
* **Live Updates**: Pushes scan progress and results using Socket.io and Server-Sent Events (SSE).
* **Storage and Caching**: Uploads tile images to S3-compatible storage (Cloudflare R2), caches data in Redis, and stores user records in MySQL and MongoDB.
* **Background Tasks**: Dispatches asynchronous jobs through RabbitMQ and Kafka.

---

## Getting Started

### Prerequisites

* Node.js 18 or higher
* Running MySQL instance
* Running Redis instance
* Running `backend-python` gRPC server (port 50051)

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in your database credentials, JWT secrets, and service URLs.

3. Run database migrations:
   ```bash
   npm run migrate
   ```

4. Start the server:
   ```bash
   # Development mode with hot reload
   npm run dev

   # Or production build
   npm run build
   npm start
   ```

The gateway listens by default at `http://localhost:5002`.

---

## Directory Layout

* `src/controllers/`: Route controllers for authentication, tile scans, and payments.
* `src/routes/`: Express route definitions.
* `src/services/`: gRPC client wrappers, queue handlers, and cloud storage clients.
* `src/proto/`: Protobuf definitions matching the Python gRPC service.
* `models/`: Sequelize and Mongoose data schemas.
* `migrations/`: Database schema migration scripts.

---

## License

This project is licensed under the [MIT License](LICENSE).
