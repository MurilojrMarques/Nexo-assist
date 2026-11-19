import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/api/api-error";
import type { AuthSession } from "@/features/auth/types";
import { createTestSession, testSession } from "@/testing/session";
import { LoginForm } from "./login-form";

const replace = vi.fn();
let search = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(search),
}));

function setup(options: Parameters<typeof createTestSession>[0] = {}) {
  const session = createTestSession(options);
  const user = userEvent.setup();
  render(<LoginForm />, { wrapper: session.Wrapper });

  return {
    ...session,
    user,
    email: screen.getByLabelText("E-mail corporativo"),
    password: screen.getByLabelText("Senha"),
    submit: screen.getByRole("button", { name: "Entrar" }),
  };
}

async function signIn(ctx: ReturnType<typeof setup>, email = "ana.souza@nexo.com.br") {
  await ctx.user.type(ctx.email, email);
  await ctx.user.type(ctx.password, "Senha-123");
  await ctx.user.click(ctx.submit);
}

describe("LoginForm", () => {
  beforeEach(() => {
    replace.mockReset();
    search = "";
  });

  it("valida os campos antes de chamar a API", async () => {
    const ctx = setup();

    await ctx.user.click(ctx.submit);

    expect(screen.getAllByRole("alert").map((alert) => alert.textContent)).toEqual([
      "Informe seu e-mail corporativo.",
      "Informe sua senha.",
    ]);
    expect(ctx.auth.login).not.toHaveBeenCalled();
  });

  it("recusa e-mail fora do domínio corporativo sem chamar a API", async () => {
    const ctx = setup();

    await signIn(ctx, "ana@gmail.com");

    expect(screen.getByText("Use seu e-mail corporativo @nexo.com.br.")).toBeInTheDocument();
    expect(ctx.auth.login).not.toHaveBeenCalled();
  });

  it("entra com o e-mail normalizado e leva o colaborador ao atendimento", async () => {
    const ctx = setup();

    await signIn(ctx, "  Ana.Souza@NEXO.com.br ");

    expect(ctx.auth.login).toHaveBeenCalledWith("ana.souza@nexo.com.br", "Senha-123");
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/chat"));
  });

  it("leva o analista ao console pelo perfil devolvido pela API", async () => {
    const ctx = setup({ auth: { login: vi.fn(async () => testSession("ANALYST")) } });

    await signIn(ctx, "rafael.lima@nexo.com.br");

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/console"));
  });

  it("volta para a página pedida antes do login", async () => {
    search = "next=%2Fperfil";
    const ctx = setup();

    await signIn(ctx);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/perfil"));
  });

  it("ignora destino externo no parâmetro next", async () => {
    search = "next=https%3A%2F%2Fsite-malicioso.com";
    const ctx = setup();

    await signIn(ctx);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/chat"));
  });

  it.each([
    [new ApiError(401, "UNAUTHORIZED", "x"), "E-mail ou senha inválidos."],
    [new ApiError(429, "TOO_MANY_REQUESTS", "Muitas tentativas. Aguarde alguns minutos e tente de novo."), "Muitas tentativas. Aguarde alguns minutos e tente de novo."],
    [ApiError.network(), "Não foi possível conectar ao servidor. Tente de novo em instantes."],
    [new Error("inesperado"), "Não foi possível entrar agora. Tente de novo em instantes."],
  ])("mostra a mensagem certa quando o login falha (%s)", async (error, message) => {
    const ctx = setup({ auth: { login: vi.fn(async () => Promise.reject(error)) } });

    await signIn(ctx);

    expect(await screen.findByText(message)).toHaveAttribute("role", "alert");
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("trava o botão enquanto o login está em andamento", async () => {
    let finish: () => void = () => undefined;
    const ctx = setup({
      auth: { login: vi.fn(() => new Promise<AuthSession>((resolve) => (finish = () => resolve(testSession())))) },
    });

    await signIn(ctx);

    expect(screen.getByRole("button", { name: "Entrando…" })).toBeDisabled();
    finish();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/chat"));
  });

  it("quem já tem sessão ativa vai direto para a sua área", async () => {
    setup({ signedInAs: "ANALYST" });

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/console"));
  });

  it("alterna a visibilidade da senha", async () => {
    const ctx = setup();

    await ctx.user.click(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(ctx.password).toHaveAttribute("type", "text");

    await ctx.user.click(screen.getByRole("button", { name: "Ocultar senha" }));
    expect(ctx.password).toHaveAttribute("type", "password");
  });
});
