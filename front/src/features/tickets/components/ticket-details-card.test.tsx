import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { TicketDetails } from "@/features/tickets/types";
import { TicketDetailsCard } from "./ticket-details-card";

const ticket: TicketDetails = {
  code: "INC-20311",
  title: "Notebook lento após atualização do Windows",
  status: "Aguardando analista",
  openedAt: "2026-10-16T14:20:00-03:00",
  description: "Lentidão geral desde a atualização de 15/10.",
  category: "Hardware › Notebook",
  priority: "Média",
  lastUpdate: { relative: "há 5 dias", overdue: true },
};

describe("TicketDetailsCard", () => {
  it("mostra os dados do chamado", () => {
    render(<TicketDetailsCard ticket={ticket} />);

    expect(screen.getByRole("heading", { name: ticket.title })).toBeInTheDocument();
    expect(screen.getByText("Aguardando analista")).toBeInTheDocument();
    expect(screen.getByText("Hardware › Notebook")).toBeInTheDocument();
    expect(screen.getByText("16 out, 14:20")).toBeInTheDocument();
  });

  it("sinaliza prazo vencido", () => {
    render(<TicketDetailsCard ticket={ticket} />);

    expect(screen.getByText("há 5 dias")).toHaveClass("text-warning-ink");
    expect(screen.getByText("· prazo vencido")).toBeInTheDocument();
  });

  it("não sinaliza quando está dentro do prazo", () => {
    render(<TicketDetailsCard ticket={{ ...ticket, lastUpdate: { relative: "há 1 dia", overdue: false } }} />);

    expect(screen.getByText("há 1 dia")).not.toHaveClass("text-warning-ink");
    expect(screen.queryByText("· prazo vencido")).not.toBeInTheDocument();
  });
});
