import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AccountDetailsCard } from "./account-details-card";

describe("AccountDetailsCard", () => {
  it("mostra nome e e-mail com o aviso de que o e-mail é gerenciado pela TI", () => {
    render(<AccountDetailsCard name="Ana Souza" email="ana.souza@nexo.com.br" />);

    expect(screen.getAllByRole("term").map((term) => term.textContent)).toEqual(["Nome", "E-mail corporativo"]);
    expect(screen.getByText("Ana Souza")).toBeInTheDocument();
    expect(screen.getByText("ana.souza@nexo.com.br")).toBeInTheDocument();
    expect(screen.getByText("Gerenciado pela TI")).toBeInTheDocument();
  });
});
