import { generateOpaqueToken, hashOpaqueToken } from "../../infra/security/opaque-token.js";
import { UnauthorizedError } from "../../shared/errors/http-errors.js";
import type {
  AccessTokenService,
  AuditLogger,
  Clock,
  PasswordHasher,
  SessionRepository,
  UserCredentials,
  UserRepository,
} from "./auth.ports.js";
import type { AuthContext, AuthenticatedUser, AuthTokens, ClientInfo } from "./auth.types.js";

export type AuthSettings = {
  refreshTokenTtlDays: number;
  sessionMaxAgeDays: number;
  maxFailedAttempts: number;
  lockoutMinutes: number;
};

export type AuthServiceDependencies = {
  users: UserRepository;
  sessions: SessionRepository;
  hasher: PasswordHasher;
  tokens: AccessTokenService;
  audit: AuditLogger;
  clock: Clock;
  settings: AuthSettings;
};

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

const invalidCredentials = () => new UnauthorizedError("E-mail ou senha inválidos.");
const invalidSession = () => new UnauthorizedError("Sessão expirada. Entre novamente.");

export class AuthService {
  private dummyHash?: Promise<string>;

  constructor(private readonly deps: AuthServiceDependencies) {}

  async login(email: string, password: string, client: ClientInfo): Promise<AuthTokens> {
    const { users, hasher, audit, clock, settings } = this.deps;
    const now = clock.now();
    const user = await users.findCredentialsByEmail(email);

    if (!user) {
      await this.spendPasswordCheck(password);
      await audit.record({ action: "LOGIN_FAILED", ...client, metadata: { reason: "UNKNOWN_EMAIL" } });
      throw invalidCredentials();
    }

    if (!user.isActive || isLocked(user, now)) {
      await this.spendPasswordCheck(password);
      await audit.record({
        action: "LOGIN_FAILED",
        actorId: user.id,
        ...client,
        metadata: { reason: user.isActive ? "ACCOUNT_LOCKED" : "ACCOUNT_INACTIVE" },
      });
      throw invalidCredentials();
    }

    if (!(await hasher.verify(user.passwordHash, password))) {
      const { locked } = await users.registerFailedLogin(user.id, {
        maxAttempts: settings.maxFailedAttempts,
        lockedUntil: new Date(now.getTime() + settings.lockoutMinutes * MINUTE_MS),
      });
      await audit.record({
        action: locked ? "ACCOUNT_LOCKED" : "LOGIN_FAILED",
        actorId: user.id,
        ...client,
        metadata: { reason: "WRONG_PASSWORD" },
      });
      throw invalidCredentials();
    }

    await users.registerSuccessfulLogin(user.id);

    if (hasher.needsRehash(user.passwordHash)) {
      await users.updatePasswordHash(user.id, await hasher.hash(password));
    }

    const tokens = await this.openSession(toAuthenticatedUser(user), now, client);
    await audit.record({ action: "LOGIN_SUCCEEDED", actorId: user.id, ...client });
    return tokens;
  }

  async refresh(refreshToken: string, client: ClientInfo): Promise<AuthTokens> {
    const { sessions, tokens, audit, clock, settings } = this.deps;
    const now = clock.now();
    const stored = await sessions.findRefreshToken(hashOpaqueToken(refreshToken));

    if (!stored) {
      throw invalidSession();
    }

    if (stored.usedAt) {
      await this.revokeForReuse(stored.sessionId, stored.user.id, now, client);
      throw invalidSession();
    }

    const sessionUsable =
      stored.expiresAt > now && stored.session.revokedAt === null && stored.session.expiresAt > now && stored.user.isActive;

    if (!sessionUsable) {
      throw invalidSession();
    }

    const nextRefreshToken = generateOpaqueToken();
    const nextExpiresAt = earliest(
      new Date(now.getTime() + settings.refreshTokenTtlDays * DAY_MS),
      stored.session.expiresAt,
    );
    const rotated = await sessions.rotateRefreshToken({
      currentTokenId: stored.id,
      sessionId: stored.sessionId,
      newTokenHash: hashOpaqueToken(nextRefreshToken),
      newExpiresAt: nextExpiresAt,
      usedAt: now,
    });

    if (!rotated) {
      await this.revokeForReuse(stored.sessionId, stored.user.id, now, client);
      throw invalidSession();
    }

    const user = toAuthenticatedUser(stored.user);
    const access = await tokens.issue({ userId: user.id, role: user.role, sessionId: stored.sessionId });
    await audit.record({ action: "TOKEN_REFRESHED", actorId: user.id, ...client });

    return {
      accessToken: access.token,
      accessTokenExpiresIn: access.expiresIn,
      refreshToken: nextRefreshToken,
      refreshTokenExpiresAt: nextExpiresAt,
      user,
    };
  }

  async logout(auth: AuthContext, client: ClientInfo): Promise<void> {
    await this.deps.sessions.revokeSession(auth.sessionId, "LOGOUT", this.deps.clock.now());
    await this.deps.audit.record({ action: "LOGOUT", actorId: auth.userId, ...client });
  }

  private async openSession(user: AuthenticatedUser, now: Date, client: ClientInfo): Promise<AuthTokens> {
    const { sessions, tokens, settings } = this.deps;
    const refreshToken = generateOpaqueToken();
    const sessionExpiresAt = new Date(now.getTime() + settings.sessionMaxAgeDays * DAY_MS);
    const refreshTokenExpiresAt = earliest(
      new Date(now.getTime() + settings.refreshTokenTtlDays * DAY_MS),
      sessionExpiresAt,
    );
    const { sessionId } = await sessions.createSession({
      userId: user.id,
      expiresAt: sessionExpiresAt,
      refreshTokenHash: hashOpaqueToken(refreshToken),
      refreshTokenExpiresAt,
      ...client,
    });
    const access = await tokens.issue({ userId: user.id, role: user.role, sessionId });

    return {
      accessToken: access.token,
      accessTokenExpiresIn: access.expiresIn,
      refreshToken,
      refreshTokenExpiresAt,
      user,
    };
  }

  private async revokeForReuse(sessionId: string, userId: string, now: Date, client: ClientInfo): Promise<void> {
    await this.deps.sessions.revokeSession(sessionId, "REFRESH_TOKEN_REUSE", now);
    await this.deps.audit.record({ action: "REFRESH_TOKEN_REUSED", actorId: userId, ...client });
  }

  private async spendPasswordCheck(password: string): Promise<void> {
    this.dummyHash ??= this.deps.hasher.hash(generateOpaqueToken());
    await this.deps.hasher.verify(await this.dummyHash, password);
  }
}

function isLocked(user: UserCredentials, now: Date): boolean {
  return user.lockedUntil !== null && user.lockedUntil > now;
}

function earliest(first: Date, second: Date): Date {
  return first < second ? first : second;
}

function toAuthenticatedUser(user: AuthenticatedUser): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    department: user.department,
    role: user.role,
    team: user.team,
  };
}
