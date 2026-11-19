import { describe, expect, it } from "vitest";
import { canAccessPath, homePathFor, postLoginPath } from "./home-path";

describe("homePathFor", () => {
  it("leva cada perfil para a sua área", () => {
    expect(homePathFor("EMPLOYEE")).toBe("/chat");
    expect(homePathFor("ANALYST")).toBe("/console");
  });
});

describe("canAccessPath", () => {
  it("separa as áreas de colaborador e de suporte", () => {
    expect(canAccessPath("EMPLOYEE", "/perfil")).toBe(true);
    expect(canAccessPath("EMPLOYEE", "/console")).toBe(false);
    expect(canAccessPath("ANALYST", "/console")).toBe(true);
    expect(canAccessPath("ANALYST", "/chat")).toBe(false);
    expect(canAccessPath("EMPLOYEE", "/chatbot")).toBe(false);
  });
});

describe("postLoginPath", () => {
  it("volta para a página pedida antes do login, com a query", () => {
    expect(postLoginPath("EMPLOYEE", "/perfil")).toBe("/perfil");
    expect(postLoginPath("EMPLOYEE", "/chat?cenario=consulta")).toBe("/chat?cenario=consulta");
  });

  it.each([
    "https://site-malicioso.com",
    "//site-malicioso.com",
    "/\site-malicioso.com",
    "javascript:alert(1)",
    "chat",
    "",
  ])("ignora destino inseguro %j", (next) => {
    expect(postLoginPath("EMPLOYEE", next)).toBe("/chat");
  });

  it("não manda o perfil para a área do outro", () => {
    expect(postLoginPath("EMPLOYEE", "/console")).toBe("/chat");
    expect(postLoginPath("ANALYST", "/perfil")).toBe("/console");
  });

  it("usa a área padrão sem destino", () => {
    expect(postLoginPath("ANALYST", null)).toBe("/console");
  });
});
