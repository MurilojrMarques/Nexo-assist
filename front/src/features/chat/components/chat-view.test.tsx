import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ChatMessage } from "@/features/chat/types";
import { ChatView } from "./chat-view";

const conversation: ChatMessage[] = [
  { id: "m1", role: "user", text: "Qual o status do meu chamado?" },
  {
    id: "m2",
    role: "agent",
    steps: ["consultou seus chamados"],
    parts: [
      { type: "text", text: "Sobre qual deles quer saber?" },
      {
        type: "ticket-picker",
        tickets: [
          { code: "INC-1", title: "Notebook lento", status: "Aguardando analista", openedAt: "2026-10-16T14:20:00-03:00" },
          { code: "REQ-2", title: "Segundo monitor", status: "Aprovado", openedAt: "2026-10-09T16:40:00-03:00" },
        ],
      },
      {
        type: "text",
        text: "Quem está sendo afetado?",
        replies: {
          options: [
            { value: "only-me", label: "Só eu" },
            { value: "my-team", label: "Minha equipe" },
          ],
        },
      },
    ],
  },
];

function renderChat(used = 18) {
  render(<ChatView initialMessages={conversation} initialUsage={{ used, limit: 30 }} />);
  return within(screen.getByRole("list", { name: "Conversa" }));
}

describe("ChatView", () => {
  it("mostra as ações do assistente acima da resposta", () => {
    renderChat();

    const steps = screen.getByRole("list", { name: "Ações do assistente" });
    expect(within(steps).getByText("consultou seus chamados")).toBeInTheDocument();
  });

  it("adiciona a mensagem enviada e atualiza o contador", async () => {
    const user = userEvent.setup();
    const conversationList = renderChat();

    await user.type(screen.getByLabelText("Mensagem para o Nexo"), "É urgente{Enter}");

    expect(conversationList.getByText("É urgente")).toBeInTheDocument();
    expect(screen.getByText("19/30 mensagens nesta sessão")).toBeInTheDocument();
  });

  it("responde pela opção rápida e trava as demais", async () => {
    const user = userEvent.setup();
    const conversationList = renderChat();

    await user.click(screen.getByRole("button", { name: "Só eu" }));

    expect(screen.getByRole("button", { name: "Só eu" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Minha equipe" })).toBeDisabled();
    expect(conversationList.getAllByText("Só eu")).toHaveLength(2);
    expect(screen.getByText("19/30 mensagens nesta sessão")).toBeInTheDocument();
  });

  it("escolhe um chamado no seletor e envia a escolha como mensagem", async () => {
    const user = userEvent.setup();
    const conversationList = renderChat();
    const picker = within(screen.getByRole("group", { name: "Seus chamados" }));

    await user.click(picker.getByRole("button", { name: /INC-1/ }));

    expect(picker.getByRole("button", { name: /INC-1/ })).toHaveAttribute("aria-pressed", "true");
    expect(picker.getByRole("button", { name: /REQ-2/ })).toBeDisabled();
    expect(conversationList.getByText("INC-1 · Notebook lento")).toBeInTheDocument();
    expect(screen.getByText("19/30 mensagens nesta sessão")).toBeInTheDocument();
  });

  it("não aceita escolhas nem mensagens depois do limite da sessão", async () => {
    const user = userEvent.setup();
    renderChat(30);

    await user.click(screen.getByRole("button", { name: /INC-1/ }));

    expect(screen.getByRole("button", { name: /INC-1/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByLabelText("Mensagem para o Nexo")).toBeDisabled();
  });
});
