import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createTestSession } from "@/testing/session";
import { ApiError } from "@/lib/api/api-error";
import type { ApiConversation, ApiDraft, ApiMessage, ConversationApi, TurnEvent } from "@/features/chat/api/conversation-api";
import { ChatScreen } from "./chat-screen";

const summary = { id: "c1", status: "WITH_AGENT" as const, messagesSent: 0, messageLimit: 30, lastMessageAt: "2026-11-19T15:00:00Z" };

const draft: ApiDraft = {
  id: "d1",
  number: 1,
  action: "CREATE",
  status: "PENDING",
  targetTicketCode: null,
  resultTicketCode: null,
  category: "NETWORK_VPN",
  priority: "HIGH",
  affectedScope: "ONLY_ME",
  title: "VPN não conecta",
  description: "Erro 809 desde ontem.",
  responseTarget: "4 horas úteis",
};

function message(overrides: Partial<ApiMessage>): ApiMessage {
  return { id: "m", author: "AGENT", authorName: null, content: "", parts: [], steps: [], createdAt: "2026-11-19T15:00:00Z", ...overrides };
}

function conversation(messages: ApiMessage[], messagesSent = 1): ApiConversation {
  return { ...summary, messagesSent, messages };
}

function fakeApi(overrides: Partial<ConversationApi> = {}): ConversationApi {
  return {
    latest: vi.fn(async () => null),
    get: vi.fn(async () => conversation([])),
    start: vi.fn(async () => summary),
    send: vi.fn(async () => undefined),
    confirmDraft: vi.fn(async () => conversation([])),
    cancelDraft: vi.fn(async () => conversation([])),
    ...overrides,
  };
}

function renderScreen(api: ConversationApi) {
  const { Wrapper } = createTestSession({ signedInAs: "EMPLOYEE" });
  render(<ChatScreen api={api} />, { wrapper: Wrapper });
}

describe("ChatScreen", () => {
  it("abre uma conversa nova no primeiro envio e mostra a resposta em streaming", async () => {
    const user = userEvent.setup();
    let emit: (event: TurnEvent) => void = () => undefined;
    let finish: () => void = () => undefined;
    const api = fakeApi({
      send: vi.fn((_id, _content, onEvent) => {
        emit = onEvent;
        return new Promise<void>((resolve) => {
          finish = resolve;
        });
      }),
    });
    renderScreen(api);

    await user.type(await screen.findByLabelText("Mensagem para o Nexo"), "Minha VPN caiu{Enter}");
    emit({ type: "message", message: message({ id: "u1", author: "EMPLOYEE", content: "Minha VPN caiu" }) });
    emit({ type: "step", step: { id: "t1", label: "buscou na central de ajuda", status: "running" } });
    emit({ type: "text", delta: "Reinicie o cliente da VPN." });

    expect(api.start).toHaveBeenCalledOnce();
    expect(api.send).toHaveBeenCalledWith("c1", "Minha VPN caiu", expect.any(Function), expect.any(AbortSignal));
    expect(await screen.findByText("Reinicie o cliente da VPN.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();

    emit({ type: "message", message: message({ id: "a1", content: "Reinicie o cliente da VPN.", steps: ["buscou na central de ajuda"] }) });
    emit({ type: "conversation", conversation: { ...summary, messagesSent: 1 } });
    finish();

    await waitFor(() => expect(screen.getByRole("button", { name: "Enviar" })).toBeEnabled());
    expect(screen.getByText("1/30 mensagens nesta sessão")).toBeInTheDocument();
    expect(screen.getAllByText("Reinicie o cliente da VPN.")).toHaveLength(1);
  });

  it("retoma a conversa aberta e confirma o rascunho pelo card", async () => {
    const user = userEvent.setup();
    const pending = [
      message({ id: "u1", author: "EMPLOYEE", content: "VPN com erro 809" }),
      message({ id: "a1", content: "Confira antes de eu criar.", parts: [{ type: "draft", draft }] }),
    ];
    const confirmed = [
      pending[0]!,
      message({ id: "a1", content: "Confira antes de eu criar.", parts: [{ type: "draft", draft: { ...draft, status: "CONFIRMED", resultTicketCode: "INC-20321" } }] }),
      message({ id: "a2", content: "Abri o chamado INC-20321 com prioridade Alta." }),
    ];
    const api = fakeApi({
      latest: vi.fn(async () => conversation(pending)),
      confirmDraft: vi.fn(async () => conversation(confirmed)),
    });
    renderScreen(api);

    const card = await screen.findByRole("region", { name: "Rascunho #1" });
    await user.click(within(card).getByRole("button", { name: "Confirmar" }));

    expect(api.confirmDraft).toHaveBeenCalledWith("c1", "d1");
    expect(await within(card).findByText("Chamado criado · INC-20321")).toBeInTheDocument();
    expect(screen.getByText("Abri o chamado INC-20321 com prioridade Alta.")).toBeInTheDocument();
  });

  it("mostra o erro da API e devolve a mensagem que não foi enviada", async () => {
    const user = userEvent.setup();
    const api = fakeApi({
      send: vi.fn(async () => Promise.reject(new ApiError(429, "MESSAGE_RATE_LIMITED", "Muitas mensagens seguidas. Aguarde um instante."))),
    });
    renderScreen(api);

    await user.type(await screen.findByLabelText("Mensagem para o Nexo"), "Oi{Enter}");

    expect(await screen.findByRole("alert")).toHaveTextContent("Muitas mensagens seguidas. Aguarde um instante.");
    expect(screen.queryByText("Oi")).not.toBeInTheDocument();
  });
});
