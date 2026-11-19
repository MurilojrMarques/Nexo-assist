import { describe, expect, it } from "vitest";
import { seedArticles } from "../../seed/seed-data.js";
import { normalize, RELEVANT_ARTICLE_SCORE, searchArticles } from "./article-search.js";

describe("busca na central de ajuda", () => {
  it("normaliza acentos, caixa e pontuação", () => {
    expect(normalize("Não CONECTA à VPN!")).toBe("nao conecta a vpn");
  });

  it("acha o artigo da VPN pelo código do erro", () => {
    const [best] = searchArticles(seedArticles, "minha vpn dá erro 809");

    expect(best?.article.slug).toBe("vpn-erro-809");
    expect(best?.score).toBeGreaterThanOrEqual(RELEVANT_ARTICLE_SCORE);
  });

  it("acha o horário de atendimento", () => {
    expect(searchArticles(seedArticles, "qual o horário do service desk?")[0]?.article.slug).toBe("horario-service-desk");
  });

  it("acha o artigo de senha do SAP bloqueada", () => {
    expect(searchArticles(seedArticles, "senha do SAP bloqueou")[0]?.article.slug).toBe("senha-sap-bloqueada");
  });

  it("não devolve nada para mensagens sem conteúdo", () => {
    expect(searchArticles(seedArticles, "oi, bom dia")).toEqual([]);
  });

  it("limita a quantidade de resultados", () => {
    expect(searchArticles(seedArticles, "senha acesso vpn outlook impressora notebook", 2)).toHaveLength(2);
  });
});
