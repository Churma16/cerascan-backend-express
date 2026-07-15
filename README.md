# CeraScan Express Service

[![Express Version](https://img.shields.io/badge/Express-v4.x-000000?logo=express&logoColor=white)](https://expressjs.com) [![Node Version](https://img.shields.io/badge/Node.js-%5E18.x-339933?logo=node.js&logoColor=white)](https://nodejs.org) [![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A personal sandbox and Express API gateway for the CeraScan ecosystem. This service acts as an experimental playground for integrating various robust technologies (such as Kafka, RabbitMQ, and AWS S3) while handling client requests, authentication, and orchestrating tasks with the underlying machine learning microservice.

---

## Key Features

*   **API Gateway**: Centralized entry point for frontend requests.
*   **Authentication & Security**: Secure OAuth 2.0 (Google), JWT-based session management, and route protection.
*   **Message Brokers**: High-throughput message queuing utilizing RabbitMQ and Kafka for background tasks.
*   **Cloud Storage**: Integration with AWS S3 / Cloudflare R2 for reliable file and media storage.
*   **Real-time & Streaming**: Utilizes Socket.io for instantaneous bidirectional web dashboard updates, and Server-Sent Events (SSE) for unidirectional real-time data feeds.
*   **Payment Gateway**: Integration with Midtrans for handling transactions (Sandbox/Dev environment only).
*   **Microservice Communication**: Acts as a bridge between the client and the Python inference engine via gRPC.
*   **Automated Jobs & Emails**: Cron jobs for scheduled tasks and Resend for transactional emails.

---

## Tech Stack & Libraries

*   **Backend**: Node.js, Express, TypeScript
*   **Database**: MySQL (Sequelize), MongoDB (Mongoose)
*   **Caching & Message Brokers**: Redis, RabbitMQ, Kafka
*   **Authentication**: Passport.js, Google OAuth, JWT, bcryptjs
*   **Cloud Storage**: AWS S3 SDK (Cloudflare R2)
*   **External Services**: Midtrans (Payments - Sandbox), Resend (Emails)
*   **Real-time & Streaming**: Socket.io, Server-Sent Events (SSE)
*   **Communication**: gRPC

---

## Installation & Setup

### Steps
1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Configure Environment**:
    ```bash
    cp .env.example .env
    ```
    Ensure you fill in your specific DB credentials, broker URLs, and secret keys.
3.  **Run Service**:
    *   Development: `npm run dev`
    *   Production: `npm start`

---

## Folder Structure

*   `src/` - Source code for controllers, routes, and services.
*   `config/` - Configuration for databases and external services.
*   `models/` - Database schemas and models.
*   `migrations/` - Database migration scripts.
<!--
---

## Acknowledgements

Special thanks and appreciation to everyone who supported the research, development, and testing of this industrial machine learning solution. *(Note: Feel free to mention your university, specific mentors, or open-source libraries here!)*-->

---

## Author

**Churma16**

---

## License

This project is licensed under the [MIT License](LICENSE).
