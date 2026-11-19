import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { createContainer } from "./container.js";

const { db, dependencies, config } = createContainer(env);
const app = createApp(dependencies, config);
const { logger } = dependencies;

const server = app.listen(env.PORT, () => {
  logger.info(`API do Nexo Assist em http://localhost:${env.PORT}/api`);
});

async function shutdown(signal: string) {
  logger.info({ signal }, "Encerrando a API");
  server.close(async () => {
    await db.$disconnect();
    process.exit(0);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
