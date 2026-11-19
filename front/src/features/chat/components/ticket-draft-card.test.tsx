import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { TicketDraft } from "@/features/chat/types";
import { TicketDraftCard } from "./ticket-draft-card";

const draft: TicketDraft = {
  code: "D-381",
  title: "VPN não conecta no notebook — erro 809",
  description: "Desde 20/10 o notebook não conecta na VPN.",
  category: "Rede e VPN",
  priority: "Alta",
  responseDue: "13:43",
  affected: "Somente você",
};

describe("TicketDraftCard", () => {
  it("mostra o rascunho aguardando confirmação", () => {
    render(<TicketDraftCard draft={draft} />);

    expect(screen.getByRole("heading", { name: draft.title })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Aguardando confirmação");
    expect(screen.getByText("Rede e VPN")).toBeInTheDocument();
    expect(screen.getByText("· resposta até 13:43")).toBeInTheDocument();
  });

  it("confirma pelo botão e esconde as ações", async () => {
    const user = userEvent.setup();
    render(<TicketDraftCard draft={draft} />);

    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(screen.getByRole("status")).toHaveTextContent("Chamado criado");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("confirma pelo atalho Ctrl+Enter", async () => {
    const user = userEvent.setup();
    render(<TicketDraftCard draft={draft} />);

    await user.keyboard("{Control>}{Enter}{/Control}");

    expect(screen.getByRole("status")).toHaveTextContent("Chamado criado");
  });

  it("cancela o rascunho", async () => {
    const user = userEvent.setup();
    render(<TicketDraftCard draft={draft} />);

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.getByRole("status")).toHaveTextContent("Rascunho cancelado");
  });

  it("ignora o atalho depois de cancelado", async () => {
    const user = userEvent.setup();
    render(<TicketDraftCard draft={draft} />);

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await user.keyboard("{Control>}{Enter}{/Control}");

    expect(screen.getByRole("status")).toHaveTextContent("Rascunho cancelado");
  });
});
