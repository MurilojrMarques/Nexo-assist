import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Composer } from "./composer";

describe("Composer", () => {
  it("envia o texto sem espaços nas pontas e limpa o campo", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<Composer usage={{ used: 18, limit: 30 }} onSend={onSend} />);

    const input = screen.getByLabelText("Mensagem para o Nexo");
    await user.type(input, "  minha impressora parou  {Enter}");

    expect(onSend).toHaveBeenCalledWith("minha impressora parou");
    expect(input).toHaveValue("");
  });

  it("não envia mensagem em branco", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<Composer usage={{ used: 18, limit: 30 }} onSend={onSend} />);

    await user.type(screen.getByLabelText("Mensagem para o Nexo"), "   ");
    await user.click(screen.getByRole("button", { name: "Enviar" }));

    expect(onSend).not.toHaveBeenCalled();
  });

  it("bloqueia o envio quando a sessão atinge o limite", () => {
    render(<Composer usage={{ used: 30, limit: 30 }} onSend={vi.fn()} />);

    expect(screen.getByLabelText("Mensagem para o Nexo")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
    expect(screen.getByText("30/30 mensagens nesta sessão")).toBeInTheDocument();
  });
});
