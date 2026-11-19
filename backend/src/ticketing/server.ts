import "dotenv/config";
import { z } from "zod";
import { createPrismaClient } from "../infra/database/prisma-client.js";
import { createLogger } from "../infra/logging/logger.js";
import { systemClock } from "../shared/time/clock.js";
import { legacyAvailability } from "./http/legacy-availability.js";
import { PrismaTicketStore } from "./prisma-ticket-store.js";
import { TicketService } from "./ticket.service.js";
import { createTicketingApp } from "./ticketing-app.js";

const parsed = z
  .object({
    TICKETING_PORT: z.coerce.number().int().positive().default(3334),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    TICKETING_SERVICE_TOKEN: z.string().min(32, "TICKETING_SERVICE_TOKEN precisa de pelo menos 32 caracteres."),
    TICKETING_FAILURE_RATE: z.coerce.number().min(0).max(1).default(0),
    TICKETING_OUTAGE_SECONDS: z.coerce.number().int().min(1).max(30).default(3),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  })
  .safeParse(process.env);

if (!parsed.success) {
  console.error("Variáveis de ambiente inválidas no serviço de chamados:\n" + z.prettifyError(parsed.error));
  process.exit(1);
}

const env = parsed.data;
const db = createPrismaClient(env.DATABASE_URL);
const logger = createLogger(env.LOG_LEVEL);
const app = createTicketingApp({
  service: new TicketService(new PrismaTicketStore(db), systemClock),
  logger,
  serviceToken: env.TICKETING_SERVICE_TOKEN,
  availability: legacyAvailability({
    failureRate: env.TICKETING_FAILURE_RATE,
    outageSeconds: env.TICKETING_OUTAGE_SECONDS,
    clock: systemClock,
  }),
});

const server = app.listen(env.TICKETING_PORT, () => {
  logger.info(`Serviço de chamados em http://localhost:${env.TICKETING_PORT}`);
});

function shutdown() {
  server.close(async () => {
    await db.$disconnect();
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
