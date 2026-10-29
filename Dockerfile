FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src ./src
COPY config ./config
RUN npm run build

FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY .sequelizerc ./
COPY config ./config
COPY migrations ./migrations

RUN mkdir -p /app/uploads

EXPOSE 5000

CMD ["node", "dist/server.js"]
