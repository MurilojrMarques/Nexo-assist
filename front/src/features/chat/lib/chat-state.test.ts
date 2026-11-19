import { describe, expect, it } from "vitest";
import type { ApiMessage, TurnEvent } from "@/features/chat/api/conversation-api";
import { chatReducer, initialChatState, STREAMING_ID, type ChatAction, type ChatState } from "./chat-state";

function apiMessage(overrides: Partial<ApiMessage>): ApiMessage {
  return { id: "x", author: "AGENT", authorName: null, content: "", parts: [], steps: [], createdAt: "2026-11-19T15:00:00Z", ...overrides };
}

function run(actions: ChatAction[], state: ChatState = { ...initialChatState, loading: false }): ChatState {
  return actions.reduce(chatReducer, state);
}

const event = (turnEvent: TurnEvent): ChatAction => ({ type: "event", event: turnEvent });

describe("chatReducer", () => {
  it("mostra a mensagem enviada na hora e troca pela versão salva quando o servidor confirma", () => {
    const state = run([
      { type: "sent", localId: "local-1", text: "Oi" },
      event({ type: "message", message: apiMessage({ id: "srv-1", author: "EMPLOYEE", content: "Oi" }) }),
    ]);

    expect(state.messages).toEqual([{ id: "srv-1", role: "user", text: "Oi" }]);
    expect(state.busy).toBe(true);
    expect(state.usage.used).toBe(1);
  });

  it("monta a resposta em andamento com passos e texto e troca pela mensagem final", () => {
    const streaming = run([
      { type: "sent", localId: "local-1", text: "VPN caiu" },
      event({ type: "step", step: { id: "t1", label: "buscou na central de ajuda", status: "running" } }),
      event({ type: "text", delta: "Tente " }),
      event({ type: "text", delta: "reconectar." }),
      event({ type: "step", step: { id: "t1", label: "buscou na central de ajuda", status: "ok" } }),
    ]);

    expect(streaming.messages.at(-1)).toMatchObject({
      id: STREAMING_ID,
      streaming: true,
      steps: [{ id: "t1", status: "ok" }],
      parts: [{ type: "text", text: "Tente reconectar." }],
    });

    const done = run(
      [
        event({ type: "message", message: apiMessage({ id: "srv-2", content: "Tente reconectar.", steps: ["buscou na central de ajuda"] }) }),
        event({ type: "conversation", conversation: { id: "c1", status: "WITH_AGENT", messagesSent: 1, messageLimit: 30, lastMessageAt: "" } }),
        { type: "finished" },
      ],
      streaming,
    );

    expect(done.messages.map((message) => message.id)).toEqual(["local-1", "srv-2"]);
    expect(done.busy).toBe(false);
    expect(done.usage).toEqual({ used: 1, limit: 30 });
  });

  it("desfaz a mensagem que não chegou ao servidor e mostra o erro", () => {
    const state = run([
      { type: "sent", localId: "local-1", text: "Oi" },
      { type: "failed", localId: "local-1", message: "Limite atingido." },
    ]);

    expect(state.messages).toEqual([]);
    expect(state.usage.used).toBe(0);
    expect(state.error).toBe("Limite atingido.");
  });

  it("mantém a mensagem já salva quando o erro chega no meio do streaming", () => {
    const state = run([
      { type: "sent", localId: "local-1", text: "Oi" },
      event({ type: "message", message: apiMessage({ id: "srv-1", author: "EMPLOYEE", content: "Oi" }) }),
      event({ type: "text", delta: "Um mom" }),
      event({ type: "error", code: "AGENT_UNAVAILABLE", message: "O assistente está indisponível agora." }),
      { type: "finished" },
    ]);

    expect(state.messages).toEqual([{ id: "srv-1", role: "user", text: "Oi" }]);
    expect(state.error).toBe("O assistente está indisponível agora.");
  });

  it("começa do zero numa conversa nova depois de uma encerrada", () => {
    const closed: ChatState = {
      ...initialChatState,
      loading: false,
      conversationId: "old",
      status: "CLOSED",
      messages: [{ id: "a", role: "user", text: "antigo" }],
      usage: { used: 12, limit: 30 },
    };

    const state = run(
      [
        { type: "sent", localId: "local-1", text: "Novo problema" },
        { type: "started", conversation: { id: "new", status: "WITH_AGENT", messagesSent: 0, messageLimit: 30, lastMessageAt: "" } },
      ],
      closed,
    );

    expect(state.conversationId).toBe("new");
    expect(state.messages).toEqual([{ id: "local-1", role: "user", text: "Novo problema" }]);
    expect(state.usage).toEqual({ used: 1, limit: 30 });
  });

  it("não troca a conversa por uma versão do servidor enquanto uma resposta está chegando", () => {
    const busy = run([{ type: "sent", localId: "local-1", text: "Oi" }]);

    const state = chatReducer(busy, {
      type: "replaced",
      conversation: { id: "c1", status: "WITH_ANALYST", messagesSent: 0, messageLimit: 30, lastMessageAt: "", messages: [] },
    });

    expect(state).toBe(busy);
  });
});
