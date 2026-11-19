import type { Database } from "../../infra/database/prisma-client.js";
import type { Logger } from "../../infra/logging/logger.js";
import type { AuditEntry, AuditLogger } from "../auth/auth.ports.js";

export class PrismaAuditLogger implements AuditLogger {
  constructor(
    private readonly db: Database,
    private readonly logger: Logger,
  ) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.db.auditLog.create({
        data: {
          action: entry.action,
          actorId: entry.actorId ?? null,
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent ?? null,
          metadata: entry.metadata ?? undefined,
        },
      });
    } catch (error) {
      this.logger.error({ err: error, action: entry.action }, "Falha ao gravar log de auditoria");
    }
  }
}
