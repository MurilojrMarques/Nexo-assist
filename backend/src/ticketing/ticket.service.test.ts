import { beforeEach, describe, expect, it } from "vitest";
import type { Ticket } from "../domain/service-desk/types.js";
import { FakeClock } from "../testing/in-memory-auth.js";
import { InMemoryTicketStore } from "../testing/in-memory-ticket-store.js";
import { TicketService } from "./ticket.service.js";

const ANA = "0196f6d2-5a7a-7c4a-9d0e-2b1f3c4d5e6f";
const BRUNO = "0196f6d2-5a7a-7c4a-9d0e-2b1f3c4d5e70";
const DAY = 86_400_000;
const NOW = new Date("2026-11-19T13:00:00Z");

function ticket(overrides: Partial<Ticket>): Ticket {
  return {
    code: "INC-20311",
    type: "INCIDENT",
    category: "HARDWARE",
    priority: "MEDIUM",
    status: "WAITING_ANALYST",
    affectedScope: "ONLY_ME",
    title: "Notebook lento",
    description: "Lento desde a atualização.",
    requesterId: ANA,
    dueAt: new Date(NOW.getTime() - 3 * DAY),
    lastActivityAt: new Date(NOW.getTime() - 6 * DAY),
    resolvedAt: null,
    createdAt: new Date(NOW.getTime() - 6 * DAY),
    ...overrides,
  };
}

const newTicket = {
  requesterId: ANA,
  type: "INCIDENT" as const,
  category: "NETWORK_VPN" as const,
  priority: "HIGH" as const,
  affectedScope: "ONLY_ME" as const,
  title: "VPN não conecta — erro 809",
  description: "Windows 11, erro 809 desde ontem.",
};

describe("TicketService", () => {
  let store: InMemoryTicketStore;
  let clock: FakeClock;
  let service: TicketService;

  beforeEach(() => {
    store = new InMemoryTicketStore();
    clock = new FakeClock(NOW);
    service = new TicketService(store, clock);
    store.seed(ticket({}));
    store.seed(ticket({ code: "INC-20150", category: "ACCESS", status: "RESOLVED", resolvedAt: new Date(NOW.getTime() - 4 * DAY) }));
    store.seed(ticket({ code: "INC-19877", category: "EMAIL", status: "RESOLVED", resolvedAt: new Date(NOW.getTime() - 78 * DAY) }));
    store.seed(ticket({ code: "INC-20320", requesterId: BRUNO }));
  });

  it("lista só os chamados do solicitante, marcando vencidos e reabríveis", async () => {
    const tickets = await service.list(ANA, "all");

    expect(tickets.map((item) => item.code).sort()).toEqual(["INC-19877", "INC-20150", "INC-20311"]);
    expect(tickets.find((item) => item.code === "INC-20311")).toMatchObject({ overdue: true, reopenable: false });
    expect(tickets.find((item) => item.code === "INC-20150")).toMatchObject({ overdue: false, reopenable: true });
    expect(tickets[0]).not.toHaveProperty("requesterId");
  });

  it("filtra só os abertos", async () => {
    expect((await service.list(ANA, "open")).map((item) => item.code)).toEqual(["INC-20311"]);
  });

  it("responde 'não encontrado' para chamado de outra pessoa, sem revelar que ele existe", async () => {
    await expect(service.get("INC-20320", ANA)).rejects.toMatchObject({ statusCode: 404 });
    await expect(service.get("INC-99999", ANA)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("cria com código sequencial e prazo calculado pela prioridade", async () => {
    const created = await service.create(newTicket, "draft-381-confirmacao");

    expect(created).toMatchObject({ code: "INC-20321", status: "OPEN", priority: "HIGH", overdue: false });
    expect(created.dueAt).toEqual(new Date("2026-11-19T17:00:00Z"));
  });

  it("não duplica o chamado quando a mesma operação é repetida", async () => {
    const first = await service.create(newTicket, "draft-381-confirmacao");
    const retry = await service.create(newTicket, "draft-381-confirmacao");

    expect(retry.code).toBe(first.code);
    expect([...store.tickets.keys()].filter((code) => code.startsWith("INC-2032"))).toEqual(["INC-20320", "INC-20321"]);
  });

  it("recusa a mesma chave de idempotência com conteúdo diferente", async () => {
    await service.create(newTicket, "draft-381-confirmacao");

    await expect(service.create({ ...newTicket, title: "Outro" }, "draft-381-confirmacao")).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it("complementa o chamado sem apagar o atraso do service desk", async () => {
    const before = await service.get("INC-20311", ANA);
    const updated = await service.addComment("INC-20311", ANA, "Continua lento após reiniciar.", "comentario-0001-xyz");

    expect(updated.overdue).toBe(true);
    expect(updated.dueAt).toEqual(before.dueAt);
    expect(updated.lastActivityAt).toEqual(before.lastActivityAt);
    expect(store.updates.at(-1)).toMatchObject({ kind: "COMMENT", content: "Continua lento após reiniciar." });
  });

  it("não deixa complementar chamado de outra pessoa", async () => {
    await expect(service.addComment("INC-20320", ANA, "oi", "comentario-0002-xyz")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("reabre resolvido há até 7 dias e recusa os mais antigos", async () => {
    const reopened = await service.reopen("INC-20150", ANA, "Bloqueou de novo.", "reabrir-0001-xyzw");

    expect(reopened).toMatchObject({ status: "OPEN", resolvedAt: null, lastActivityAt: NOW, overdue: false });
    expect(reopened.dueAt).toEqual(new Date("2026-11-24T13:00:00Z"));
    await expect(service.reopen("INC-19877", ANA, "Voltou.", "reabrir-0002-xyzw")).rejects.toMatchObject({ statusCode: 409 });
  });

  it("transfere para analista registrando equipe e resumo", async () => {
    const transferred = await service.transfer("INC-20311", ANA, "Suporte N2", "Lentidão há 6 dias, prazo vencido.", "transferir-0001-xy");

    expect(transferred).toMatchObject({ status: "WAITING_ANALYST", overdue: true });
    expect(store.updates.at(-1)).toMatchObject({ kind: "TRANSFERRED", content: "Suporte N2: Lentidão há 6 dias, prazo vencido." });
  });

  it("aponta chamados abertos e reabríveis da mesma categoria para evitar duplicidade", async () => {
    const related = await service.related(ANA, "ACCESS");

    expect(related.open).toEqual([]);
    expect(related.reopenable.map((item) => item.code)).toEqual(["INC-20150"]);
  });
});
