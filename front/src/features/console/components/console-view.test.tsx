import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  mockAnalyst,
  mockConversations,
  mockEmployeeTickets,
  mockThreads,
} from "@/features/console/mock/console-data";
import { ConsoleView } from "./console-view";

function renderConsole() {
  const user = userEvent.setup();
  render(
    <ConsoleView
      analyst={mockAnalyst}
      initialConversations={mockConversations}
      initialThreads={mockThreads}
      ticketsByConversation={mockEmployeeTickets}
    />,
  );

  return {
    user,
    list: () => within(screen.getByRole("list", { name: "Conversas" })),
    chat: () => within(screen.getByRole("region", { name: /Conversa com/ })),
  };
}

function names(list: ReturnType<ReturnType<typeof renderConsole>["list"]>) {
  return list.getAllByRole("button").map((item) => item.textContent ?? "");
}

describe("ConsoleView", () => {
  it("abre em Para você, com as conversas que precisam de um analista", () => {
    const { list } = renderConsole();

    expect(screen.getByRole("button", { name: "Para você (3)" })).toHaveAttribute("aria-pressed", "true");
    expect(names(list())).toEqual([
      expect.stringContaining("Ana Souza"),
      expect.stringContaining("Carla Mendes"),
      expect.stringContaining("Bruno Tavares"),
    ]);
  });

  it("troca de filtro e pesquisa por chamado", async () => {
    const { user, list } = renderConsole();

    await user.click(screen.getByRole("button", { name: "Com o agent (2)" }));
    expect(names(list())).toEqual([expect.stringContaining("Diego Ramos"), expect.stringContaining("Elisa Prado")]);

    await user.click(screen.getByRole("button", { name: "Todas" }));
    await user.type(screen.getByRole("searchbox", { name: "Pesquisar conversa ou chamado" }), "INC-20519");
    expect(names(list())).toEqual([expect.stringContaining("Elisa Prado")]);
  });

  it("mostra a conversa transferida com o histórico de chamados do funcionário", () => {
    const { chat } = renderConsole();

    expect(chat().getByText("Ana espera um atendente")).toBeInTheDocument();
    expect(chat().getByText("Agent pausado · até 12:05")).toBeInTheDocument();
    expect(chat().getByRole("textbox", { name: "Resposta" })).toBeDisabled();

    const tickets = within(screen.getByRole("complementary", { name: "Chamados de Ana" }));
    expect(tickets.getByText("3 abertos · 2 encerrados")).toBeInTheDocument();
    expect(tickets.getByText("Transferido para um analista")).toBeInTheDocument();
  });

  it("assume o atendimento, responde e encerra", async () => {
    const { user, chat, list } = renderConsole();

    await user.click(chat().getByRole("button", { name: "Assumir atendimento" }));

    expect(chat().getByText(/Rafael Lima assumiu · agent pausado/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Minhas (1)" })).toBeInTheDocument();
    expect(screen.getByText("Assumido por Rafael Lima")).toBeInTheDocument();
    expect(screen.getAllByText("Em atendimento").length).toBeGreaterThan(0);

    await user.type(chat().getByRole("textbox", { name: "Resposta para Ana" }), "Oi, Ana! Aqui é o Rafael.{Enter}");

    expect(chat().getByText("Oi, Ana! Aqui é o Rafael.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Todas" }));
    expect(list().getByText("Você: Oi, Ana! Aqui é o Rafael.")).toBeInTheDocument();

    await user.click(chat().getByRole("button", { name: "Encerrar atendimento" }));

    expect(chat().getByText(/Rafael Lima encerrou o atendimento/)).toBeInTheDocument();
    expect(chat().getByText("Esta conversa foi encerrada.")).toBeInTheDocument();
  });

  it("devolve a conversa ao agent", async () => {
    const { user, chat } = renderConsole();

    await user.click(chat().getByRole("button", { name: "Devolver ao agent" }));

    expect(chat().getByText(/Rafael Lima devolveu ao agent/)).toBeInTheDocument();
    expect(chat().getByText("O agent está atendendo esta conversa")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Para você (2)" })).toBeInTheDocument();
  });

  it("abre outra conversa e zera as não lidas", async () => {
    const { user, list } = renderConsole();

    await user.click(list().getByRole("button", { name: /Carla Mendes/ }));

    expect(screen.getByRole("region", { name: "Conversa com Carla Mendes" })).toBeInTheDocument();
    expect(list().getByRole("button", { name: /Carla Mendes/ })).not.toHaveTextContent("Mensagens não lidas");
  });

  it("fecha e reabre o painel de chamados", async () => {
    const { user } = renderConsole();

    await user.click(screen.getByRole("button", { name: "Fechar chamados" }));
    expect(screen.queryByRole("complementary", { name: "Chamados de Ana" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mostrar chamados" }));
    expect(screen.getByRole("complementary", { name: "Chamados de Ana" })).toBeInTheDocument();
  });
});
