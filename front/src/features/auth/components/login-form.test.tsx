import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./login-form";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

function setup() {
  const user = userEvent.setup();
  render(<LoginForm />);

  return {
    user,
    email: screen.getByLabelText("E-mail corporativo"),
    password: screen.getByLabelText("Senha"),
    submit: screen.getByRole("button", { name: "Entrar" }),
  };
}

describe("LoginForm", () => {
  beforeEach(() => {
    push.mockReset();
  });

  it("mostra os erros e não navega quando os campos estão vazios", async () => {
    const { user, email, password, submit } = setup();

    await user.click(submit);

    expect(screen.getAllByRole("alert").map((alert) => alert.textContent)).toEqual([
      "Informe seu e-mail corporativo.",
      "Informe sua senha.",
    ]);
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(password).toHaveAttribute("aria-invalid", "true");
    expect(push).not.toHaveBeenCalled();
  });

  it("recusa e-mail fora do domínio corporativo", async () => {
    const { user, email, password, submit } = setup();

    await user.type(email, "ana@gmail.com");
    await user.type(password, "qualquer");
    await user.click(submit);

    expect(screen.getByText("Use seu e-mail corporativo @nexo.com.br.")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("entra no chat com e-mail corporativo e qualquer senha", async () => {
    const { user, email, password, submit } = setup();

    await user.type(email, "ana.souza@nexo.com.br");
    await user.type(password, "qualquer");
    await user.click(submit);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(push).toHaveBeenCalledWith("/chat");
  });

  it("leva o analista ao console de conversas", async () => {
    const { user, email, password, submit } = setup();

    await user.type(email, "Rafael.Lima@nexo.com.br");
    await user.type(password, "qualquer");
    await user.click(submit);

    expect(push).toHaveBeenCalledWith("/console");
  });

  it("alterna a visibilidade da senha", async () => {
    const { user, password } = setup();

    expect(password).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(password).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: "Ocultar senha" }));
    expect(password).toHaveAttribute("type", "password");
  });

  it("começa com a opção de manter conectado marcada", () => {
    setup();

    expect(screen.getByRole("checkbox", { name: "Manter conectado neste computador" })).toBeChecked();
  });
});
