import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ChatMessage } from "@/features/chat/types";
import { ChatView, EDIT_DRAFT_PREFIX } from "./chat-view";

const pickerTurn: ChatMessage[] = [
  { id: "m1", role: "user", text: "Qual o status do meu chamado?" },
  {
    id: "m2",
    role: "agent",
    author: "Nexo Assist",
    steps: [{ id: "s1", label: "consultou seus chamados", status: "ok" }],
    parts: [
      {
        type: "text",
        text: "Sobre qual deles quer saber?",
        replies: {
          options: [
            { value: "Só eu", label: "Só eu" },
            { value: "Minha equipe", label: "Minha equipe" },
          ],
        },
      },
      {
        type: "ticket-picker",
        tickets: [
          { code: "INC-1", title: "Notebook lento", status: "Aguardando analista", openedAt: "2026-10-16T14:20:00-03:00" },
          { code: "REQ-2", title: "Segundo monitor", status: "Aprovado", openedAt: "2026-10-09T16:40:00-03:00" },
        ],
      },
    ],
  },
];

const draftTurn: ChatMessage = {
  id: "m3",
  role: "agent",
  author: "Nexo Assist",
  steps: [],
  parts: [
    {
      type: "ticket-draft",
      draft: {
        id: "d1",
        number: 4,
        action: "CREATE",
        status: "pending",
        targetTicketCode: null,
        resultTicketCode: null,
        title: "VPN não conecta",
        description: "Erro 809.",
        category: "Rede e VPN",
        priority: "Alta",
        responseTarget: "4 horas úteis",
        affected: "Somente você",
      },
    },
  ],
};

function renderChat({ messages = pickerTurn, used = 2, busy = false } = {}) {
  const handlers = { onSend: vi.fn(), onConfirmDraft: vi.fn(), onCancelDraft: vi.fn() };
  render(<ChatView messages={messages} usage={{ used, limit: 30 }} busy={busy} {...handlers} />);
  return handlers;
}

describe("ChatView", () => {
  it("mostra as ações do assistente acima da resposta", () => {
    renderChat();

    const steps = screen.getByRole("list", { name: "Ações do assistente" });
    expect(within(steps).getByText("consultou seus chamados")).toBeInTheDocument();
  });

  it("envia a mensagem digitada", async () => {
    const user = userEvent.setup();
    const { onSend } = renderChat();

    await user.type(screen.getByLabelText("Mensagem para o Nexo"), "É urgente{Enter}");

    expect(onSend).toHaveBeenCalledWith("É urgente");
    expect(screen.getByLabelText("Mensagem para o Nexo")).toHaveValue("");
  });

  it("responde pela opção rápida e trava as demais", async () => {
    const user = userEvent.setup();
    const { onSend } = renderChat();

    await user.click(screen.getByRole("button", { name: "Só eu" }));

    expect(onSend).toHaveBeenCalledWith("Só eu");
    expect(screen.getByRole("button", { name: "Só eu" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Minha equipe" })).toBeDisabled();
  });

  it("escolhe um chamado no seletor e envia a escolha como mensagem", async () => {
    const user = userEvent.setup();
    const { onSend } = renderChat();
    const picker = within(screen.getByRole("group", { name: "Seus chamados" }));

    await user.click(picker.getByRole("button", { name: /INC-1/ }));

    expect(onSend).toHaveBeenCalledWith("INC-1 · Notebook lento");
    expect(picker.getByRole("button", { name: /REQ-2/ })).toBeDisabled();
  });

  it("só a última resposta aceita escolhas", () => {
    renderChat({ messages: [...pickerTurn, { id: "m3", role: "user", text: "Deixa pra lá" }] });

    expect(screen.getByRole("button", { name: "Só eu" })).toBeDisabled();
  });

  it("não aceita escolhas nem envio enquanto o assistente responde", async () => {
    const user = userEvent.setup();
    const { onSend } = renderChat({ busy: true });

    await user.type(screen.getByLabelText("Mensagem para o Nexo"), "Oi{Enter}");

    expect(screen.getByRole("button", { name: "Só eu" })).toBeDisabled();
    expect(onSend).not.toHaveBeenCalled();
  });

  it("não aceita mensagens depois do limite da sessão", () => {
    renderChat({ used: 30 });

    expect(screen.getByLabelText("Mensagem para o Nexo")).toBeDisabled();
    expect(screen.getByRole("button", { name: /INC-1/ })).toBeDisabled();
  });

  it("confirma o rascunho e leva o Editar para o campo de mensagem", async () => {
    const user = userEvent.setup();
    const { onConfirmDraft } = renderChat({ messages: [draftTurn] });

    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    await user.click(screen.getByRole("button", { name: "Editar" }));

    expect(onConfirmDraft).toHaveBeenCalledWith("d1");
    expect(screen.getByLabelText("Mensagem para o Nexo")).toHaveValue(EDIT_DRAFT_PREFIX);
    expect(screen.getByLabelText("Mensagem para o Nexo")).toHaveFocus();
  });

  it("convida a começar quando a conversa está vazia", () => {
    renderChat({ messages: [] });

    expect(screen.getByText("Como posso ajudar com TI hoje?")).toBeInTheDocument();
  });
});
