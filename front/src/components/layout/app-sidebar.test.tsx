import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppSidebar } from "./app-sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/chat",
}));

const user = { name: "Ana Souza", email: "ana.souza@nexo.com.br" };

describe("AppSidebar", () => {
  it("marca a página atual no menu", () => {
    render(<AppSidebar user={user} />);

    expect(screen.getByRole("link", { name: "Atendimento" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Meu perfil" })).not.toHaveAttribute("aria-current");
  });

  it("recolhe e expande o menu ao clicar no logo", async () => {
    const userEvents = userEvent.setup();
    render(<AppSidebar user={user} />);

    const toggle = screen.getByRole("button", { name: "Recolher menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    await userEvents.click(toggle);

    const collapsedToggle = screen.getByRole("button", { name: "Expandir menu" });
    expect(collapsedToggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Ana Souza").parentElement).toHaveClass("hidden");

    await userEvents.click(collapsedToggle);

    expect(screen.getByRole("button", { name: "Recolher menu" })).toBeInTheDocument();
  });

  it("mostra as iniciais e os dados do usuário", () => {
    render(<AppSidebar user={user} />);

    expect(screen.getByText("AS")).toBeInTheDocument();
    expect(screen.getByText("ana.souza@nexo.com.br")).toBeInTheDocument();
  });
});
