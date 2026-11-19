import type { AuthenticatedUser, ClientInfo, Role } from "./auth.types.js";

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(hash: string, plain: string): Promise<boolean>;
  needsRehash(hash: string): boolean;
}

export type AccessTokenClaims = {
  userId: string;
  role: Role;
  sessionId: string;
};

export interface AccessTokenService {
  issue(claims: AccessTokenClaims): Promise<{ token: string; expiresIn: number }>;
  verify(token: string): Promise<AccessTokenClaims>;
}

export type UserCredentials = AuthenticatedUser & {
  passwordHash: string;
  lockedUntil: Date | null;
  isActive: boolean;
};

export type LockoutPolicy = {
  maxAttempts: number;
  lockedUntil: Date;
};

export interface UserRepository {
  findCredentialsByEmail(email: string): Promise<UserCredentials | null>;
  findActiveById(id: string): Promise<AuthenticatedUser | null>;
  registerFailedLogin(userId: string, policy: LockoutPolicy): Promise<{ locked: boolean }>;
  registerSuccessfulLogin(userId: string): Promise<void>;
  updatePasswordHash(userId: string, passwordHash: string): Promise<void>;
}

export type SessionRevocationReason = "LOGOUT" | "REFRESH_TOKEN_REUSE" | "PASSWORD_CHANGED" | "EXPIRED";

export type NewSession = ClientInfo & {
  userId: string;
  expiresAt: Date;
  refreshTokenHash: string;
  refreshTokenExpiresAt: Date;
};

export type StoredRefreshToken = {
  id: string;
  sessionId: string;
  expiresAt: Date;
  usedAt: Date | null;
  session: {
    expiresAt: Date;
    revokedAt: Date | null;
  };
  user: AuthenticatedUser & { isActive: boolean };
};

export type RefreshTokenRotation = {
  currentTokenId: string;
  sessionId: string;
  newTokenHash: string;
  newExpiresAt: Date;
  usedAt: Date;
};

export interface SessionRepository {
  createSession(session: NewSession): Promise<{ sessionId: string }>;
  findRefreshToken(tokenHash: string): Promise<StoredRefreshToken | null>;
  rotateRefreshToken(rotation: RefreshTokenRotation): Promise<boolean>;
  revokeSession(sessionId: string, reason: SessionRevocationReason, at: Date): Promise<void>;
  findActiveSessionUser(sessionId: string, now: Date): Promise<AuthenticatedUser | null>;
}

export type AuditAction =
  | "LOGIN_SUCCEEDED"
  | "LOGIN_FAILED"
  | "ACCOUNT_LOCKED"
  | "TOKEN_REFRESHED"
  | "REFRESH_TOKEN_REUSED"
  | "LOGOUT";

export type AuditEntry = ClientInfo & {
  action: AuditAction;
  actorId?: string;
  metadata?: Record<string, string>;
};

export interface AuditLogger {
  record(entry: AuditEntry): Promise<void>;
}

export type { Clock } from "../../shared/time/clock.js";
