FROM node:20-alpine
WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY dist ./dist
COPY .sequelizerc ./
COPY config ./config
COPY migrations ./migrations

EXPOSE 5000

# 4. Jalankan aplikasi
CMD ["node", "dist/server.js"]