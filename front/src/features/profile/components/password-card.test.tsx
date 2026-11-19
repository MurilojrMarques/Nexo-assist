import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordCard } from "./password-card";

const email = "ana.souza@nexo.com.br";

describe("PasswordCard", () => {
  it("mostra quando a senha foi alterada e para onde vai o link", () => {
    render(<PasswordCard email={email} passwordUpdated="há 42 dias" />);

    expect(screen.getByText("Alterada há 42 dias")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(`Enviaremos um link de redefinição para ${email}.`);
  });

  it("confirma o envio do link e evita reenvio", async () => {
    const user = userEvent.setup();
    render(<PasswordCard email={email} passwordUpdated="há 42 dias" />);

    await user.click(screen.getByRole("button", { name: "Redefinir senha" }));

    expect(screen.getByRole("button", { name: "Link enviado" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(`Link enviado para ${email}.`);
  });
});
