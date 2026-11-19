import { describe, expect, it } from "vitest";
import { validateLogin } from "./validate-login";

describe("validateLogin", () => {
  it("aceita e-mail corporativo com qualquer senha", () => {
    expect(validateLogin({ email: "ana.souza@nexo.com.br", password: "x" })).toEqual({
      success: true,
      data: { email: "ana.souza@nexo.com.br", password: "x" },
    });
  });

  it("normaliza espaços e maiúsculas do e-mail", () => {
    const result = validateLogin({ email: "  Ana.Souza@NEXO.com.br ", password: "123" });

    expect(result).toEqual({
      success: true,
      data: { email: "ana.souza@nexo.com.br", password: "123" },
    });
  });

  it("exige e-mail e senha", () => {
    expect(validateLogin({ email: "", password: "" })).toEqual({
      success: false,
      errors: {
        email: "Informe seu e-mail corporativo.",
        password: "Informe sua senha.",
      },
    });
  });

  it("rejeita e-mail em formato inválido", () => {
    const result = validateLogin({ email: "ana.souza", password: "123" });

    expect(result).toEqual({ success: false, errors: { email: "Digite um e-mail válido." } });
  });

  it.each(["ana@gmail.com", "ana@nexo.com", "ana@fake-nexo.com.br"])(
    "rejeita domínio fora da Nexo: %s",
    (email) => {
      const result = validateLogin({ email, password: "123" });

      expect(result).toEqual({
        success: false,
        errors: { email: "Use seu e-mail corporativo @nexo.com.br." },
      });
    },
  );
});
