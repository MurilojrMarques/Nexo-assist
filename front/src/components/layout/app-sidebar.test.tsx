import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppSidebar, type SidebarItem } from "./app-sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/chat",
}));

const user = { name: "Ana Souza", email: "ana.souza@nexo.com.br" };

const items: SidebarItem[] = [
  { href: "/chat", label: "Atendimento", icon: "chat" },
  { href: "/perfil", label: "Meu perfil", icon: "profile" },
];

describe("AppSidebar", () => {
  it("marca a página atual no menu", () => {
    render(<AppSidebar user={user} items={items} onSignOut={vi.fn()} />);

    expect(screen.getByRole("link", { name: "Atendimento" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Meu perfil" })).not.toHaveAttribute("aria-current");
  });

  it("recolhe e expande o menu ao clicar no logo", async () => {
    const userEvents = userEvent.setup();
    render(<AppSidebar user={user} items={items} onSignOut={vi.fn()} />);

    const toggle = screen.getByRole("button", { name: "Recolher menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    await userEvents.click(toggle);

    const collapsedToggle = screen.getByRole("button", { name: "Expandir menu" });
    expect(collapsedToggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Ana Souza").parentElement).toHaveClass("hidden");

    await userEvents.click(collapsedToggle);

    expect(screen.getByRole("button", { name: "Recolher menu" })).toBeInTheDocument();
  });

  it("pode começar recolhido", () => {
    render(<AppSidebar user={user} items={items} defaultCollapsed onSignOut={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Expandir menu" })).toHaveAttribute("aria-expanded", "false");
  });

  it("abre o menu recolhido ao clicar em um item de navegação", async () => {
    const userEvents = userEvent.setup();
    render(<AppSidebar user={user} items={items} defaultCollapsed onSignOut={vi.fn()} />);

    await userEvents.click(screen.getByRole("link", { name: "Atendimento" }));

    expect(screen.getByRole("button", { name: "Recolher menu" })).toHaveAttribute("aria-expanded", "true");
  });

  it("não recolhe o menu aberto ao navegar", async () => {
    const userEvents = userEvent.setup();
    render(<AppSidebar user={user} items={items} onSignOut={vi.fn()} />);

    await userEvents.click(screen.getByRole("link", { name: "Meu perfil" }));

    expect(screen.getByRole("button", { name: "Recolher menu" })).toHaveAttribute("aria-expanded", "true");
  });

  it("abre e recolhe o menu ao clicar na conta", async () => {
    const userEvents = userEvent.setup();
    render(<AppSidebar user={user} items={items} defaultCollapsed onSignOut={vi.fn()} />);

    const account = screen.getByRole("button", { name: "Conta de Ana Souza" });
    await userEvents.click(account);
    expect(account).toHaveAttribute("aria-expanded", "true");

    await userEvents.click(account);
    expect(account).toHaveAttribute("aria-expanded", "false");
  });

  it("mostra o contador do item", () => {
    render(<AppSidebar user={user} items={[{ href: "/console", label: "Conversas", icon: "chat", badge: 5 }]} onSignOut={vi.fn()} />);

    expect(screen.getByRole("link", { name: "Conversas (5)" })).toBeInTheDocument();
  });

  it("mostra as iniciais e os dados do usuário", () => {
    render(<AppSidebar user={user} items={items} onSignOut={vi.fn()} />);

    expect(screen.getByText("AS")).toBeInTheDocument();
    expect(screen.getByText("ana.souza@nexo.com.br")).toBeInTheDocument();
  });

  it("encerra a sessão pelo botão Sair", async () => {
    const userEvents = userEvent.setup();
    const onSignOut = vi.fn();
    render(<AppSidebar user={user} items={items} onSignOut={onSignOut} />);

    await userEvents.click(screen.getByRole("button", { name: "Sair" }));

    expect(onSignOut).toHaveBeenCalledOnce();
  });
});
