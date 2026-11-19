import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { TicketDraft } from "@/features/chat/types";
import { TicketDraftCard } from "./ticket-draft-card";

const draft: TicketDraft = {
  id: "d1",
  number: 381,
  action: "CREATE",
  status: "pending",
  targetTicketCode: null,
  resultTicketCode: null,
  title: "VPN não conecta no notebook, erro 809",
  description: "Desde ontem o notebook não conecta na VPN.",
  category: "Rede e VPN",
  priority: "Alta",
  responseTarget: "4 horas úteis",
  affected: "Somente você",
};

function renderCard(overrides: Partial<TicketDraft> = {}, actionable = true) {
  const handlers = { onConfirm: vi.fn(), onCancel: vi.fn(), onEdit: vi.fn() };
  render(<TicketDraftCard draft={{ ...draft, ...overrides }} actionable={actionable} {...handlers} />);
  return handlers;
}

describe("TicketDraftCard", () => {
  it("mostra o rascunho aguardando confirmação com o prazo da prioridade", () => {
    renderCard();

    expect(screen.getByRole("heading", { name: draft.title })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Aguardando confirmação");
    expect(screen.getByText("Rascunho #381")).toBeInTheDocument();
    expect(screen.getByText("· resposta em até 4 horas úteis")).toBeInTheDocument();
  });

  it("confirma, edita e cancela pelos botões", async () => {
    const user = userEvent.setup();
    const handlers = renderCard();

    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    await user.click(screen.getByRole("button", { name: "Editar" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(handlers.onConfirm).toHaveBeenCalledOnce();
    expect(handlers.onEdit).toHaveBeenCalledOnce();
    expect(handlers.onCancel).toHaveBeenCalledOnce();
  });

  it("confirma pelo atalho Ctrl+Enter", async () => {
    const user = userEvent.setup();
    const handlers = renderCard();

    await user.keyboard("{Control>}{Enter}{/Control}");

    expect(handlers.onConfirm).toHaveBeenCalledOnce();
  });

  it("mostra o chamado criado e esconde as ações depois de confirmado", async () => {
    const user = userEvent.setup();
    const handlers = renderCard({ status: "confirmed", resultTicketCode: "INC-20321" });

    await user.keyboard("{Control>}{Enter}{/Control}");

    expect(screen.getByRole("status")).toHaveTextContent("Chamado criado · INC-20321");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(handlers.onConfirm).not.toHaveBeenCalled();
  });

  it("identifica rascunho de atualização de um chamado existente", () => {
    renderCard({ action: "UPDATE", targetTicketCode: "INC-20311" });

    expect(screen.getByText("Atualizar INC-20311")).toBeInTheDocument();
  });

  it("não oferece ações enquanto o assistente responde", () => {
    renderCard({}, false);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
