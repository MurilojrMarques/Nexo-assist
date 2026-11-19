import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { createTestSession } from "@/testing/session";
import { RoleGate } from "./role-gate";

const replace = vi.fn();
let pathname = "/chat";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => pathname,
}));

function renderGate(options: Parameters<typeof createTestSession>[0], role: "EMPLOYEE" | "ANALYST" = "EMPLOYEE") {
  const { Wrapper } = createTestSession(options);
  render(<RoleGate role={role}>{(user) => <p>Conteúdo de {user.name}</p>}</RoleGate>, { wrapper: Wrapper });
}

describe("RoleGate", () => {
  beforeEach(() => {
    replace.mockReset();
    pathname = "/chat";
  });

  it("mostra a verificação de sessão enquanto carrega", () => {
    renderGate({ signedInAs: "EMPLOYEE" });

    expect(screen.getByRole("status")).toHaveTextContent("Verificando sua sessão…");
  });

  it("libera o conteúdo para o perfil certo", async () => {
    renderGate({ signedInAs: "EMPLOYEE" });

    expect(await screen.findByText("Conteúdo de Ana Souza")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("manda para o login, guardando a página pedida, quando não há sessão", async () => {
    pathname = "/perfil";
    renderGate({});

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login?next=%2Fperfil"));
    expect(screen.queryByText(/Conteúdo de/)).not.toBeInTheDocument();
  });

  it("devolve o analista para o console se ele tentar a área do colaborador", async () => {
    renderGate({ signedInAs: "ANALYST" }, "EMPLOYEE");

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/console"));
    expect(screen.queryByText(/Conteúdo de/)).not.toBeInTheDocument();
  });

  it("devolve o colaborador para o atendimento se ele tentar o console", async () => {
    pathname = "/console";
    renderGate({ signedInAs: "EMPLOYEE" }, "ANALYST");

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/chat"));
  });
});
