import { describe, expect, it } from "vitest";
import { endsTurn, replyText } from "./mastra-service-desk-agent.js";

describe("fim do turno do agent", () => {
  it("encerra depois de oferecer respostas rápidas, sem gastar outra etapa do modelo", () => {
    expect(endsTurn([{ toolCalls: [{ toolName: "offerQuickReplies" }] }], 5)).toBe(true);
    expect(endsTurn([{ toolCalls: [{ payload: { toolName: "offerQuickReplies" } }] }], 5)).toBe(true);
  });

  it("segue depois de uma consulta, para o modelo usar o resultado", () => {
    expect(endsTurn([{ toolCalls: [{ toolName: "searchHelpCenter" }] }], 5)).toBe(false);
  });

  it("respeita o limite de etapas", () => {
    expect(endsTurn([{}, {}, {}], 3)).toBe(true);
  });
});

describe("texto final da resposta", () => {
  it("usa a pergunta das respostas rápidas quando o modelo não escreveu texto", () => {
    expect(replyText("", "Qual é a versão do Windows?")).toBe("Qual é a versão do Windows?");
  });

  it("prefere o texto escrito pelo modelo", () => {
    expect(replyText("O artigo vale para o Windows 10. Qual é a sua versão?", "Qual é a versão?")).toBe(
      "O artigo vale para o Windows 10. Qual é a sua versão?",
    );
  });
});
