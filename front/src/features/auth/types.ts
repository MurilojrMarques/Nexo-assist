export type Role = "EMPLOYEE" | "ANALYST";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  department: string;
  role: Role;
  team: string | null;
};

export type AuthSession = {
  accessToken: string;
  expiresIn: number;
  user: SessionUser;
};
