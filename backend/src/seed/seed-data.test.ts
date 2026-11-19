import { describe, expect, it } from "vitest";
import { isOverdue, isReopenable } from "../domain/service-desk/ticket-rules.js";
import { buildSeedTickets, seedArticles, seedUsers, type SeedTicket } from "./seed-data.js";

const brt = (local: string) => new Date(`${local}-03:00`);

const moments = [
  ["quinta de manhã", brt("2026-11-19T10:00:00")],
  ["sexta à noite", brt("2026-11-20T21:30:00")],
  ["sábado", brt("2026-11-21T15:00:00")],
  ["segunda antes do expediente", brt("2026-11-23T07:00:00")],
  ["madrugada de quarta", brt("2026-11-25T02:00:00")],
] as const;

function find(tickets: SeedTicket[], code: string): SeedTicket {
  const ticket = tickets.find((item) => item.code === code);

  if (!ticket) {
    throw new Error(`Chamado ${code} não está no seed`);
  }

  return ticket;
}

describe("dados de exemplo (Anexo B)", () => {
  const tickets = buildSeedTickets(brt("2026-11-19T10:00:00"));

  it("reproduz a tabela do Anexo B", () => {
    expect(find(tickets, "INC-20311")).toMatchObject({ category: "HARDWARE", priority: "MEDIUM", status: "WAITING_ANALYST" });
    expect(find(tickets, "REQ-10442")).toMatchObject({ category: "HARDWARE", priority: "LOW", status: "APPROVED" });
    expect(find(tickets, "INC-20150")).toMatchObject({ category: "ACCESS", priority: "MEDIUM", status: "RESOLVED" });
  });

  it("tem os dois artigos do Anexo B e entre 5 e 10 artigos", () => {
    const contents = seedArticles.map((article) => article.content);

    expect(seedArticles.length).toBeGreaterThanOrEqual(5);
    expect(seedArticles.length).toBeLessThanOrEqual(10);
    expect(contents).toContain(
      "VPN com erro 809: reinstale o cliente de VPN pelo portal de softwares e reinicie o computador. Vale apenas para Windows 10; no Windows 11, abra um chamado.",
    );
    expect(contents).toContain("Horário do service desk: de segunda a sexta, das 8h às 18h. Chamados críticos têm plantão 24 horas.");
  });

  it("tem funcionários com e-mail corporativo e analistas com equipe", () => {
    expect(seedUsers.every((user) => /^[a-z.]+@nexo\.com\.br$/.test(user.email))).toBe(true);
    expect(seedUsers.filter((user) => user.role === "ANALYST").every((user) => user.team)).toBe(true);
    expect(new Set(seedUsers.map((user) => user.email)).size).toBe(seedUsers.length);
  });

  it("todo chamado tem os campos obrigatórios da abertura e código coerente com o tipo", () => {
    for (const ticket of tickets) {
      expect(ticket.title.trim()).not.toBe("");
      expect(ticket.description.trim()).not.toBe("");
      expect(ticket.code.startsWith(ticket.type === "INCIDENT" ? "INC-" : "REQ-")).toBe(true);
      expect(seedUsers.map((user) => user.email)).toContain(ticket.requester);
    }
  });

  it("cobre as situações pedidas: aberto, vencido, resolvido recentemente e de outros funcionários", () => {
    const now = brt("2026-11-19T10:00:00");
    const requesters = new Set(tickets.map((ticket) => ticket.requester));

    expect(tickets.some((ticket) => !ticket.resolvedAt && !isOverdue(ticket, now))).toBe(true);
    expect(tickets.some((ticket) => isOverdue(ticket, now))).toBe(true);
    expect(tickets.some((ticket) => isReopenable(ticket, now))).toBe(true);
    expect(requesters.size).toBeGreaterThanOrEqual(4);
  });

  it("dá a prioridade crítica à equipe parada, como manda a tabela de prioridades", () => {
    expect(find(tickets, "INC-20320")).toMatchObject({ priority: "CRITICAL", affectedScope: "TEAM" });
    expect(find(tickets, "REQ-10511")).toMatchObject({ priority: "HIGH", priorityRule: "Há um compromisso no mesmo dia" });
  });

  it.each(moments)("mantém a mesma história em qualquer horário do seed (%s)", (_label, now) => {
    const generated = buildSeedTickets(now);

    expect(isOverdue(find(generated, "INC-20311"), now)).toBe(true);
    expect(isOverdue(find(generated, "INC-20290"), now)).toBe(true);
    expect(isOverdue(find(generated, "REQ-10442"), now)).toBe(false);
    expect(isOverdue(find(generated, "INC-20298"), now)).toBe(false);
    expect(isOverdue(find(generated, "INC-20320"), now)).toBe(false);
    expect(isOverdue(find(generated, "REQ-10511"), now)).toBe(false);
    expect(isReopenable(find(generated, "INC-20150"), now)).toBe(true);
    expect(isReopenable(find(generated, "REQ-10460"), now)).toBe(false);
    expect(isReopenable(find(generated, "INC-19877"), now)).toBe(false);
  });
});
