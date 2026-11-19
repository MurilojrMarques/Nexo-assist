import type { Database } from "../../infra/database/prisma-client.js";
import type { TicketReader, TicketSummary } from "./ticket.types.js";

export class PrismaTicketRepository implements TicketReader {
  constructor(private readonly db: Database) {}

  listByRequester(requesterId: string): Promise<TicketSummary[]> {
    return this.db.ticket.findMany({
      where: { requesterId },
      orderBy: { lastActivityAt: "desc" },
      select: {
        code: true,
        type: true,
        category: true,
        priority: true,
        status: true,
        affectedScope: true,
        title: true,
        dueAt: true,
        lastActivityAt: true,
        resolvedAt: true,
        createdAt: true,
      },
    });
  }
}
