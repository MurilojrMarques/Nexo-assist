import { currentUser } from "@/features/auth/mock/current-user";

export type Profile = {
  name: string;
  email: string;
  passwordUpdated: string;
};

export const mockProfile: Profile = {
  ...currentUser,
  passwordUpdated: "há 42 dias",
};
