FROM node:24-slim AS dev

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3333

CMD ["node", "--import", "tsx", "src/server.ts"]
