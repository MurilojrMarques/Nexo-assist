import { withRetry } from "../../infra/http/retry.js";
import { AppError } from "../../shared/errors/app-error.js";
import { ConflictError, NotFoundError, ServiceUnavailableError } from "../../shared/errors/http-errors.js";
import type { TicketCategory } from "../../domain/service-desk/types.js";
import type {
  CreateTicketInput,
  RelatedTickets,
  TicketGateway,
  TicketStatusFilter,
  TicketView,
} from "./ticket.types.js";

export type TicketGatewaySettings = {
  baseUrl: string;
  serviceToken: string;
  timeoutMs: number;
  maxAttempts: number;
  baseDelayMs: number;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};

type RequestSpec = {
  method: "GET" | "POST";
  path: string;
  query?: Record<string, string>;
  body?: unknown;
  idempotencyKey?: string;
};

class TransientFailure extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = "TransientFailure";
  }
}

const unavailable = () =>
  new ServiceUnavailableError(
    "O sistema de chamados está instável agora. Tente de novo em alguns segundos.",
    "TICKET_SERVICE_UNAVAILABLE",
  );

async function readMessage(response: Response, fallback: string): Promise<string> {
  const payload = (await response.json().catch(() => null)) as { error?: { message?: unknown } } | null;
  return typeof payload?.error?.message === "string" ? payload.error.message : fallback;
}

export class HttpTicketGateway implements TicketGateway {
  private readonly fetch: typeof fetch;

  constructor(private readonly settings: TicketGatewaySettings) {
    this.fetch = settings.fetch ?? fetch;
  }

  async listByRequester(requesterId: string, status: TicketStatusFilter = "all"): Promise<TicketView[]> {
    const { tickets } = await this.send<{ tickets: TicketView[] }>({
      method: "GET",
      path: "/tickets",
      query: { requesterId, status },
    });
    return tickets;
  }

  async getForRequester(code: string, requesterId: string): Promise<TicketView> {
    const { ticket } = await this.send<{ ticket: TicketView }>({
      method: "GET",
      path: `/tickets/${encodeURIComponent(code)}`,
      query: { requesterId },
    });
    return ticket;
  }

  findRelated(requesterId: string, category: TicketCategory): Promise<RelatedTickets> {
    return this.send<RelatedTickets>({ method: "GET", path: "/tickets/related", query: { requesterId, category } });
  }

  async create(input: CreateTicketInput, idempotencyKey: string): Promise<TicketView> {
    return (await this.send<{ ticket: TicketView }>({ method: "POST", path: "/tickets", body: input, idempotencyKey })).ticket;
  }

  async addComment(code: string, requesterId: string, comment: string, idempotencyKey: string): Promise<TicketView> {
    return this.mutate(code, "comments", { requesterId, comment }, idempotencyKey);
  }

  async reopen(code: string, requesterId: string, reason: string, idempotencyKey: string): Promise<TicketView> {
    return this.mutate(code, "reopen", { requesterId, reason }, idempotencyKey);
  }

  async transfer(code: string, requesterId: string, team: string, summary: string, idempotencyKey: string): Promise<TicketView> {
    return this.mutate(code, "transfer", { requesterId, team, summary }, idempotencyKey);
  }

  private async mutate(code: string, action: string, body: unknown, idempotencyKey: string): Promise<TicketView> {
    const path = `/tickets/${encodeURIComponent(code)}/${action}`;
    return (await this.send<{ ticket: TicketView }>({ method: "POST", path, body, idempotencyKey })).ticket;
  }

  private async send<T>(spec: RequestSpec): Promise<T> {
    try {
      return await withRetry(() => this.attempt<T>(spec), {
        maxAttempts: this.settings.maxAttempts,
        baseDelayMs: this.settings.baseDelayMs,
        isRetryable: (error) => error instanceof TransientFailure,
        sleep: this.settings.sleep,
      });
    } catch (error) {
      throw error instanceof TransientFailure ? unavailable() : error;
    }
  }

  private async attempt<T>(spec: RequestSpec): Promise<T> {
    const url = new URL(`${this.settings.baseUrl}${spec.path}`);
    Object.entries(spec.query ?? {}).forEach(([key, value]) => url.searchParams.set(key, value));

    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${this.settings.serviceToken}`,
    };

    if (spec.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    if (spec.idempotencyKey) {
      headers["Idempotency-Key"] = spec.idempotencyKey;
    }

    let response: Response;

    try {
      response = await this.fetch(url, {
        method: spec.method,
        headers,
        body: spec.body === undefined ? undefined : JSON.stringify(spec.body),
        signal: AbortSignal.timeout(this.settings.timeoutMs),
      });
    } catch (error) {
      throw new TransientFailure(error instanceof Error ? error.name : "NetworkError");
    }

    if (response.ok) {
      return (await response.json()) as T;
    }

    if (response.status >= 500) {
      throw new TransientFailure(`HTTP ${response.status}`);
    }

    if (response.status === 404) {
      throw new NotFoundError(await readMessage(response, "Chamado não encontrado."));
    }

    if (response.status === 409) {
      throw new ConflictError(await readMessage(response, "Operação em conflito com o estado do chamado."));
    }

    throw new AppError("Falha ao consultar o sistema de chamados.", 502, "TICKET_SERVICE_ERROR");
  }
}
