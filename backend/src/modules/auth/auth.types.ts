export const roles = ["EMPLOYEE", "ANALYST"] as const;

export type Role = (typeof roles)[number];

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  department: string;
  role: Role;
  team: string | null;
};

export type AuthContext = {
  userId: string;
  role: Role;
  sessionId: string;
};

export type ClientInfo = {
  ipAddress?: string;
  userAgent?: string;
};

export type AuthTokens = {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: AuthenticatedUser;
};
