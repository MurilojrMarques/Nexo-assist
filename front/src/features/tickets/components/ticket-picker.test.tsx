import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { TicketSummary } from "@/features/tickets/types";
import { TicketPicker } from "./ticket-picker";

const tickets: TicketSummary[] = [
  { code: "INC-20311", title: "Notebook lento após atualização", status: "Aguardando analista", openedAt: "2026-10-16T14:20:00-03:00" },
  { code: "REQ-10442", title: "Segundo monitor para home office", status: "Aprovado", openedAt: "2026-10-09T16:40:00-03:00" },
];

describe("TicketPicker", () => {
  it("lista código, título, status e data de abertura", () => {
    render(<TicketPicker tickets={tickets} onSelect={vi.fn()} />);

    const first = screen.getByRole("button", { name: /INC-20311/ });
    expect(first).toHaveTextContent("Notebook lento após atualização");
    expect(first).toHaveTextContent("Aguardando analista");
    expect(first).toHaveTextContent("16 out");
  });

  it("avisa qual chamado foi escolhido", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<TicketPicker tickets={tickets} onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: /REQ-10442/ }));

    expect(onSelect).toHaveBeenCalledWith(tickets[1]);
  });

  it("depois de respondido, marca a escolha e trava a lista", () => {
    render(<TicketPicker tickets={tickets} selected="INC-20311" onSelect={vi.fn()} />);

    expect(screen.getByRole("button", { name: /INC-20311/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /REQ-10442/ })).toBeDisabled();
  });
});
