FROM node:24-slim AS dev

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN chown node:node /app
USER node

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci

COPY --chown=node:node --chmod=755 . .
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma generate

EXPOSE 3333

CMD ["sh", "-c", "npx prisma migrate deploy && node --import tsx src/server.ts"]
