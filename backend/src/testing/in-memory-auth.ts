import { randomUUID } from "node:crypto";
import type {
  AuditEntry,
  AuditLogger,
  Clock,
  LockoutPolicy,
  NewSession,
  PasswordHasher,
  RefreshTokenRotation,
  SessionRepository,
  SessionRevocationReason,
  StoredRefreshToken,
  UserCredentials,
  UserRepository,
} from "../modules/auth/auth.ports.js";
import type { AuthenticatedUser } from "../modules/auth/auth.types.js";

type UserRecord = UserCredentials & { failedLoginAttempts: number };

export class FakeClock implements Clock {
  private current: Date;

  constructor(start = new Date("2026-11-19T12:00:00Z")) {
    this.current = start;
  }

  now(): Date {
    return new Date(this.current);
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

export class FakeHasher implements PasswordHasher {
  verifyCalls = 0;

  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    this.verifyCalls += 1;
    return hash === `hashed:${plain}` || hash === `legacy:${plain}`;
  }

  needsRehash(hash: string): boolean {
    return hash.startsWith("legacy:");
  }
}

export class RecordingAudit implements AuditLogger {
  readonly entries: AuditEntry[] = [];

  async record(entry: AuditEntry): Promise<void> {
    this.entries.push(entry);
  }

  actions(): string[] {
    return this.entries.map((entry) => entry.action);
  }
}

function publicUser(user: UserRecord): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    department: user.department,
    role: user.role,
    team: user.team,
  };
}

export class InMemoryUsers implements UserRepository {
  readonly records = new Map<string, UserRecord>();

  add(user: Partial<UserRecord> & Pick<UserRecord, "email" | "passwordHash">): UserRecord {
    const record: UserRecord = {
      id: randomUUID(),
      name: "Pessoa Teste",
      department: "TI",
      role: "EMPLOYEE",
      team: null,
      lockedUntil: null,
      isActive: true,
      failedLoginAttempts: 0,
      ...user,
    };
    this.records.set(record.id, record);
    return record;
  }

  async findCredentialsByEmail(email: string): Promise<UserCredentials | null> {
    const user = [...this.records.values()].find((record) => record.email === email);
    return user ? { ...user } : null;
  }

  async findActiveById(id: string): Promise<AuthenticatedUser | null> {
    const user = this.records.get(id);
    return user?.isActive ? publicUser(user) : null;
  }

  async registerFailedLogin(userId: string, policy: LockoutPolicy): Promise<{ locked: boolean }> {
    const user = this.records.get(userId)!;
    user.failedLoginAttempts += 1;

    if (user.failedLoginAttempts < policy.maxAttempts) {
      return { locked: false };
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = policy.lockedUntil;
    return { locked: true };
  }

  async registerSuccessfulLogin(userId: string): Promise<void> {
    const user = this.records.get(userId)!;
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    this.records.get(userId)!.passwordHash = passwordHash;
  }
}

type SessionRecord = {
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedReason: SessionRevocationReason | null;
};

type TokenRecord = {
  id: string;
  sessionId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
};

export class InMemorySessions implements SessionRepository {
  readonly sessions = new Map<string, SessionRecord>();
  readonly tokens = new Map<string, TokenRecord>();

  constructor(private readonly users: InMemoryUsers) {}

  async createSession(session: NewSession): Promise<{ sessionId: string }> {
    const id = randomUUID();
    this.sessions.set(id, { id, userId: session.userId, expiresAt: session.expiresAt, revokedAt: null, revokedReason: null });
    this.addToken(id, session.refreshTokenHash, session.refreshTokenExpiresAt);
    return { sessionId: id };
  }

  async findRefreshToken(tokenHash: string): Promise<StoredRefreshToken | null> {
    const token = [...this.tokens.values()].find((record) => record.tokenHash === tokenHash);

    if (!token) {
      return null;
    }

    const session = this.sessions.get(token.sessionId)!;
    const user = this.users.records.get(session.userId)!;

    return {
      id: token.id,
      sessionId: token.sessionId,
      expiresAt: token.expiresAt,
      usedAt: token.usedAt,
      session: { expiresAt: session.expiresAt, revokedAt: session.revokedAt },
      user: { ...publicUser(user), isActive: user.isActive },
    };
  }

  async rotateRefreshToken(rotation: RefreshTokenRotation): Promise<boolean> {
    const current = this.tokens.get(rotation.currentTokenId);

    if (!current || current.usedAt) {
      return false;
    }

    current.usedAt = rotation.usedAt;
    this.addToken(rotation.sessionId, rotation.newTokenHash, rotation.newExpiresAt);
    return true;
  }

  async revokeSession(sessionId: string, reason: SessionRevocationReason, at: Date): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (session && !session.revokedAt) {
      session.revokedAt = at;
      session.revokedReason = reason;
    }
  }

  async findActiveSessionUser(sessionId: string, now: Date): Promise<AuthenticatedUser | null> {
    const session = this.sessions.get(sessionId);
    const user = session ? this.users.records.get(session.userId) : undefined;

    if (!session || !user || session.revokedAt || session.expiresAt <= now || !user.isActive) {
      return null;
    }

    return publicUser(user);
  }

  private addToken(sessionId: string, tokenHash: string, expiresAt: Date): void {
    const id = randomUUID();
    this.tokens.set(id, { id, sessionId, tokenHash, expiresAt, usedAt: null });
  }
}
