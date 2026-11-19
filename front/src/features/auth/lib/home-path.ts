import { analystEmails } from "@/features/auth/mock/accounts";

export function homePathFor(email: string): "/chat" | "/console" {
  return analystEmails.includes(email) ? "/console" : "/chat";
}
