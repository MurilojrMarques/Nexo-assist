import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import type { Ticket } from "../../domain/service-desk/types.js";
import { createLogger } from "../../infra/logging/logger.js";
import { FakeClock } from "../../testing/in-memory-auth.js";
import { InMemoryTicketStore } from "../../testing/in-memory-ticket-store.js";
import { legacyAvailability } from "../../ticketing/http/legacy-availability.js";
import { TicketService } from "../../ticketing/ticket.service.js";
import { createTicketingApp } from "../../ticketing/ticketing-app.js";
import { HttpTicketGateway, type TicketGatewaySettings } from "./http-ticket-gateway.js";

const ANA = "0196f6d2-5a7a-7c4a-9d0e-2b1f3c4d5e6f";
const BRUNO = "0196f6d2-5a7a-7c4a-9d0e-2b1f3c4d5e70";
const TOKEN = "t".repeat(40);
const NOW = new Date("2026-11-19T13:00:00Z");

const seeded: Ticket = {
  code: "INC-20311",
  type: "INCIDENT",
  category: "HARDWARE",
  priority: "MEDIUM",
  status: "WAITING_ANALYST",
  affectedScope: "ONLY_ME",
  title: "Notebook lento",
  description: "Lento desde a atualização.",
  requesterId: ANA,
  dueAt: new Date("2026-11-16T13:00:00Z"),
  lastActivityAt: new Date("2026-11-13T13:00:00Z"),
  resolvedAt: null,
  createdAt: new Date("2026-11-13T13:00:00Z"),
};

const newTicket = {
  requesterId: ANA,
  type: "INCIDENT" as const,
  category: "NETWORK_VPN" as const,
  priority: "HIGH" as const,
  affectedScope: "ONLY_ME" as const,
  title: "VPN não conecta — erro 809",
  description: "Windows 11.",
};

let server: Server | undefined;

afterEach(() => {
  server?.close();
  server = undefined;
});

async function startTicketing(options: { failures?: number[]; outageSeconds?: number } = {}) {
  const clock = new FakeClock(NOW);
  const store = new InMemoryTicketStore();
  store.seed(seeded);
  const rolls = [...(options.failures ?? [])];
  const app = createTicketingApp({
    service: new TicketService(store, clock),
    logger: createLogger("silent"),
    serviceToken: TOKEN,
    availability: legacyAvailability({
      failureRate: 0.5,
      outageSeconds: options.outageSeconds ?? 3,
      random: () => rolls.shift() ?? 1,
      clock,
    }),
  });

  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  const { port } = server.address() as AddressInfo;

  return { clock, store, baseUrl: `http://127.0.0.1:${port}` };
}

function gateway(baseUrl: string, clock: FakeClock, overrides: Partial<TicketGatewaySettings> = {}) {
  const sleeps: number[] = [];
  const instance = new HttpTicketGateway({
    baseUrl,
    serviceToken: TOKEN,
    timeoutMs: 1000,
    maxAttempts: 4,
    baseDelayMs: 400,
    sleep: async (ms) => {
      sleeps.push(ms);
      clock.advance(ms);
    },
    ...overrides,
  });

  return { instance, sleeps };
}

describe("serviço de chamados: acesso entre serviços", () => {
  it("recusa chamadas sem o token de serviço ou com token errado", async () => {
    const { baseUrl } = await startTicketing();

    const missing = await fetch(`${baseUrl}/tickets?requesterId=${ANA}`);
    const wrong = await fetch(`${baseUrl}/tickets?requesterId=${ANA}`, { headers: { Authorization: "Bearer errado" } });

    expect(missing.status).toBe(401);
    expect(wrong.status).toBe(401);
  });

  it("exige chave de idempotência para criar", async () => {
    const { baseUrl } = await startTicketing();
    const response = await fetch(`${baseUrl}/tickets`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(newTicket),
    });

    expect(response.status).toBe(400);
  });
});

describe("HttpTicketGateway", () => {
  it("consulta os chamados do solicitante", async () => {
    const { baseUrl, clock } = await startTicketing();
    const { instance } = gateway(baseUrl, clock);

    const tickets = await instance.listByRequester(ANA);

    expect(tickets).toEqual([expect.objectContaining({ code: "INC-20311", overdue: true })]);
  });

  it("trata chamado de outra pessoa como inexistente", async () => {
    const { baseUrl, clock } = await startTicketing();
    const { instance } = gateway(baseUrl, clock);

    await expect(instance.getForRequester("INC-20311", BRUNO)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("aguarda o sistema legado voltar e completa a operação", async () => {
    const { baseUrl, clock } = await startTicketing({ failures: [0], outageSeconds: 1 });
    const { instance, sleeps } = gateway(baseUrl, clock);

    const tickets = await instance.listByRequester(ANA);

    expect(tickets).toHaveLength(1);
    expect(sleeps.length).toBeGreaterThanOrEqual(2);
  });

  it("desiste com erro claro quando o sistema continua fora do ar", async () => {
    const { baseUrl, clock } = await startTicketing({ failures: [0], outageSeconds: 30 });
    const { instance, sleeps } = gateway(baseUrl, clock);

    await expect(instance.listByRequester(ANA)).rejects.toMatchObject({
      statusCode: 503,
      code: "TICKET_SERVICE_UNAVAILABLE",
    });
    expect(sleeps).toHaveLength(3);
  });

  it("não duplica o chamado quando a resposta se perde e a operação é repetida", async () => {
    const { baseUrl, clock, store } = await startTicketing();
    let lostResponses = 1;
    const flakyFetch: typeof fetch = async (input, init) => {
      const response = await fetch(input, init);

      if (lostResponses > 0) {
        lostResponses -= 1;
        throw new TypeError("conexão interrompida");
      }

      return response;
    };
    const { instance } = gateway(baseUrl, clock, { fetch: flakyFetch });

    const created = await instance.create(newTicket, "draft-0381-confirmacao");

    expect(created.code).toBe("INC-20321");
    expect([...store.tickets.keys()]).toEqual(["INC-20311", "INC-20321"]);
  });

  it("repete a chamada quando o sistema demora além do limite", async () => {
    const { baseUrl, clock } = await startTicketing();
    let slowCalls = 1;
    const slowFetch: typeof fetch = (input, init) => {
      if (slowCalls > 0) {
        slowCalls -= 1;
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("timeout", "TimeoutError")));
        });
      }

      return fetch(input, init);
    };
    const { instance } = gateway(baseUrl, clock, { fetch: slowFetch, timeoutMs: 50 });

    await expect(instance.listByRequester(ANA)).resolves.toHaveLength(1);
  });

  it("devolve conflito de regra de negócio sem repetir", async () => {
    const { baseUrl, clock } = await startTicketing();
    const { instance, sleeps } = gateway(baseUrl, clock);

    await expect(instance.reopen("INC-20311", ANA, "Voltou", "reabrir-0001-abcd")).rejects.toMatchObject({ statusCode: 409 });
    expect(sleeps).toHaveLength(0);
  });
});
