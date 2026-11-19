import type { Database } from "../../infra/database/prisma-client.js";
import type { LockoutPolicy, UserCredentials, UserRepository } from "./auth.ports.js";
import type { AuthenticatedUser } from "./auth.types.js";

export const authenticatedUserSelect = {
  id: true,
  email: true,
  name: true,
  department: true,
  role: true,
  team: true,
} as const;

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly db: Database) {}

  findCredentialsByEmail(email: string): Promise<UserCredentials | null> {
    return this.db.user.findUnique({
      where: { email },
      select: { ...authenticatedUserSelect, passwordHash: true, lockedUntil: true, isActive: true },
    });
  }

  findActiveById(id: string): Promise<AuthenticatedUser | null> {
    return this.db.user.findFirst({ where: { id, isActive: true }, select: authenticatedUserSelect });
  }

  registerFailedLogin(userId: string, policy: LockoutPolicy): Promise<{ locked: boolean }> {
    return this.db.$transaction(async (tx) => {
      const { failedLoginAttempts } = await tx.user.update({
        where: { id: userId },
        data: { failedLoginAttempts: { increment: 1 } },
        select: { failedLoginAttempts: true },
      });

      if (failedLoginAttempts < policy.maxAttempts) {
        return { locked: false };
      }

      await tx.user.update({
        where: { id: userId },
        data: { failedLoginAttempts: 0, lockedUntil: policy.lockedUntil },
      });
      return { locked: true };
    });
  }

  async registerSuccessfulLogin(userId: string): Promise<void> {
    await this.db.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.db.user.update({ where: { id: userId }, data: { passwordHash } });
  }
}
