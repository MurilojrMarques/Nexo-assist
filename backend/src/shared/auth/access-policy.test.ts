import { describe, expect, it } from "vitest";
import type { AuthContext } from "../../modules/auth/auth.types.js";
import { canAccessConversation, canReadTicket } from "./access-policy.js";

const ana: AuthContext = { userId: "ana", role: "EMPLOYEE", sessionId: "s1" };
const bruno: AuthContext = { userId: "bruno", role: "EMPLOYEE", sessionId: "s2" };
const rafael: AuthContext = { userId: "rafael", role: "ANALYST", sessionId: "s3" };

describe("access-policy", () => {
  it("funcionário lê só os próprios chamados", () => {
    expect(canReadTicket(ana, { requesterId: "ana" })).toBe(true);
    expect(canReadTicket(bruno, { requesterId: "ana" })).toBe(false);
  });

  it("analista lê chamados de qualquer funcionário", () => {
    expect(canReadTicket(rafael, { requesterId: "ana" })).toBe(true);
  });

  it("funcionário acessa só as próprias conversas", () => {
    expect(canAccessConversation(ana, { employeeId: "ana" })).toBe(true);
    expect(canAccessConversation(bruno, { employeeId: "ana" })).toBe(false);
    expect(canAccessConversation(rafael, { employeeId: "ana" })).toBe(true);
  });
});
