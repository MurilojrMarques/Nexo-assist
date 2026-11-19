import "dotenv/config";
import { createPrismaClient } from "../src/infra/database/prisma-client.js";
import { Argon2PasswordHasher } from "../src/infra/security/argon2-password-hasher.js";
import { buildSeedTickets, lastSequenceNumber, seedArticles, seedUsers } from "../src/seed/seed-data.js";

function readSeedPassword(): string {
  if (process.env.NODE_ENV === "production") {
    throw new Error("O seed de dados de exemplo não roda em produção.");
  }

  const password = process.env.SEED_USER_PASSWORD;

  if (!password || password.length < 8) {
    throw new Error("Defina SEED_USER_PASSWORD com pelo menos 8 caracteres.");
  }

  return password;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("Defina DATABASE_URL.");
  }

  const passwordHash = await new Argon2PasswordHasher().hash(readSeedPassword());
  const tickets = buildSeedTickets(new Date());
  const db = createPrismaClient(databaseUrl);

  try {
    const userIds = new Map<string, string>();

    for (const user of seedUsers) {
      const data = { ...user, passwordHash };
      const saved = await db.user.upsert({
        where: { email: user.email },
        create: data,
        update: { ...data, failedLoginAttempts: 0, lockedUntil: null, isActive: true },
        select: { id: true },
      });
      userIds.set(user.email, saved.id);
    }

    await db.knowledgeArticle.deleteMany({ where: { slug: { notIn: seedArticles.map((article) => article.slug) } } });

    for (const article of seedArticles) {
      await db.knowledgeArticle.upsert({ where: { slug: article.slug }, create: article, update: article });
    }

    for (const ticket of tickets) {
      const requesterId = userIds.get(ticket.requester);

      if (!requesterId) {
        throw new Error(`Solicitante desconhecido: ${ticket.requester}`);
      }

      const { requester: _requester, priorityRule, ...fields } = ticket;
      const data = { ...fields, requesterId };
      const saved = await db.ticket.upsert({
        where: { code: ticket.code },
        create: data,
        update: data,
        select: { id: true },
      });

      await db.ticketUpdate.deleteMany({ where: { ticketId: saved.id } });
      await db.ticketUpdate.create({
        data: {
          ticketId: saved.id,
          authorId: requesterId,
          kind: "CREATED",
          toStatus: "OPEN",
          content: `Prioridade ${ticket.priority}: ${priorityRule}`,
          createdAt: ticket.createdAt,
        },
      });

      if (ticket.status !== "OPEN") {
        await db.ticketUpdate.create({
          data: {
            ticketId: saved.id,
            kind: "STATUS_CHANGED",
            fromStatus: "OPEN",
            toStatus: ticket.status,
            createdAt: ticket.lastActivityAt,
          },
        });
      }
    }

    for (const type of ["INCIDENT", "REQUEST"] as const) {
      const lastNumber = lastSequenceNumber(tickets, type);
      await db.ticketSequence.upsert({ where: { type }, create: { type, lastNumber }, update: { lastNumber } });
    }

    console.log(
      `Seed concluído: ${seedUsers.length} usuários, ${seedArticles.length} artigos, ${tickets.length} chamados.`,
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
