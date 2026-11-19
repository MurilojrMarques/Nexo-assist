import type { Database } from "../../infra/database/prisma-client.js";
import type {
  NewSession,
  RefreshTokenRotation,
  SessionRepository,
  SessionRevocationReason,
  StoredRefreshToken,
} from "./auth.ports.js";
import type { AuthenticatedUser } from "./auth.types.js";
import { authenticatedUserSelect } from "./prisma-user.repository.js";

export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly db: Database) {}

  async createSession(session: NewSession): Promise<{ sessionId: string }> {
    const created = await this.db.session.create({
      data: {
        userId: session.userId,
        expiresAt: session.expiresAt,
        ipAddress: session.ipAddress ?? null,
        userAgent: session.userAgent ?? null,
        refreshTokens: {
          create: { tokenHash: session.refreshTokenHash, expiresAt: session.refreshTokenExpiresAt },
        },
      },
      select: { id: true },
    });

    return { sessionId: created.id };
  }

  async findRefreshToken(tokenHash: string): Promise<StoredRefreshToken | null> {
    const token = await this.db.refreshToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        sessionId: true,
        expiresAt: true,
        usedAt: true,
        session: {
          select: {
            expiresAt: true,
            revokedAt: true,
            user: { select: { ...authenticatedUserSelect, isActive: true } },
          },
        },
      },
    });

    if (!token) {
      return null;
    }

    const { user, ...session } = token.session;
    return { ...token, session, user };
  }

  rotateRefreshToken(rotation: RefreshTokenRotation): Promise<boolean> {
    return this.db.$transaction(async (tx) => {
      const { count } = await tx.refreshToken.updateMany({
        where: { id: rotation.currentTokenId, usedAt: null },
        data: { usedAt: rotation.usedAt },
      });

      if (count === 0) {
        return false;
      }

      await tx.refreshToken.create({
        data: {
          sessionId: rotation.sessionId,
          tokenHash: rotation.newTokenHash,
          expiresAt: rotation.newExpiresAt,
        },
      });
      await tx.session.update({ where: { id: rotation.sessionId }, data: { lastSeenAt: rotation.usedAt } });
      return true;
    });
  }

  async revokeSession(sessionId: string, reason: SessionRevocationReason, at: Date): Promise<void> {
    await this.db.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: at, revokedReason: reason },
    });
  }

  async findActiveSessionUser(sessionId: string, now: Date): Promise<AuthenticatedUser | null> {
    const session = await this.db.session.findFirst({
      where: { id: sessionId, revokedAt: null, expiresAt: { gt: now }, user: { isActive: true } },
      select: { user: { select: authenticatedUserSelect } },
    });

    return session?.user ?? null;
  }
}
