import { describe, expect, it } from "vitest";
import { finalizeReply, plainText, polish, ReplyComposer, StreamPolisher } from "./reply-text.js";

function streamThrough(chunks: string[]): string {
  const polisher = new StreamPolisher();
  return chunks.map((chunk) => polisher.push(chunk)).join("") + polisher.flush();
}

function compose(run: (composer: ReplyComposer) => void): { streamed: string; final: string } {
  let streamed = "";
  const composer = new ReplyComposer((delta) => {
    streamed += delta;
  });
  run(composer);
  const final = composer.finish();
  return { streamed, final };
}

describe("texto das respostas", () => {
  it("troca travessões por vírgula e mantém hífens de palavras", () => {
    expect(polish("A VPN caiu — tente de novo no Wi-Fi do e-mail", true)).toBe("A VPN caiu, tente de novo no Wi-Fi do e-mail");
    expect(polish("Atendimento das 8–18h", true)).toBe("Atendimento das 8 a 18h");
    expect(polish("Reinicie - depois teste", true)).toBe("Reinicie, depois teste");
  });

  it("tira listas com hífen, negrito e títulos de markdown", () => {
    expect(polish("## Passos\n- Abra o app\n* Clique em **Conectar**", true)).toBe("Passos\nAbra o app\nClique em Conectar");
  });

  it("mantém passo a passo numerado", () => {
    expect(polish("1. Abra o app\n2. Conecte", true)).toBe("1. Abra o app\n2. Conecte");
  });

  it("limpa mesmo quando o modelo quebra o padrão entre pedaços do stream", () => {
    expect(streamThrough(["A VPN caiu ", "—", " tente", " de novo.\n", "-", " Abra o **Glo", "bal", "Protect**"])).toBe(
      "A VPN caiu, tente de novo.\nAbra o GlobalProtect",
    );
  });

  it("título de chamado vira uma linha simples", () => {
    expect(plainText("VPN não conecta — erro 809\n")).toBe("VPN não conecta, erro 809");
  });

  it("remove a despedida genérica do final", () => {
    expect(finalizeReply("Reinicie o notebook e teste de novo. Qualquer dúvida, estou à disposição!")).toBe(
      "Reinicie o notebook e teste de novo.",
    );
    expect(finalizeReply("Funcionou? Se não, me avise que preparo o chamado.")).toBe("Funcionou? Se não, me avise que preparo o chamado.");
  });

  it("não deixa a resposta vazia por causa da limpeza", () => {
    expect(finalizeReply("Fico à disposição!")).toBe("Fico à disposição!");
  });
});

describe("montagem da resposta em streaming", () => {
  it("descarta o anúncio feito antes de uma consulta", () => {
    const { streamed, final } = compose((composer) => {
      composer.delta("Vou verificar seus chamados.");
      composer.toolCalled(true);
      composer.stepFinished();
      composer.delta("Você tem 2 chamados abertos.");
    });

    expect(streamed).toBe("Você tem 2 chamados abertos.");
    expect(final).toBe("Você tem 2 chamados abertos.");
  });

  it("mantém o texto escrito antes de mostrar opções ou um rascunho", () => {
    const { final } = compose((composer) => {
      composer.delta("Qual desses chamados é o seu caso?");
      composer.toolCalled(false);
    });

    expect(final).toBe("Qual desses chamados é o seu caso?");
  });

  it("corta a interjeição de abertura", () => {
    const { streamed } = compose((composer) => {
      composer.delta("Claro! ");
      composer.delta("Abra o GlobalProtect e clique em Conectar.");
    });

    expect(streamed).toBe("Abra o GlobalProtect e clique em Conectar.");
  });

  it("não segura textos longos: depois do limite o stream segue normal", () => {
    const deltas: string[] = [];
    const composer = new ReplyComposer((delta) => deltas.push(delta), { holdLimit: 10 });

    composer.delta("Abra o aplicativo ");
    composer.delta("e clique em Conectar.");

    expect(deltas).toEqual(["Abra o aplicativo", " e clique em Conectar."]);
  });

  it("separa por parágrafo o texto de etapas diferentes", () => {
    const { final } = compose((composer) => {
      composer.delta("Encontrei um artigo.");
      composer.toolCalled(false);
      composer.stepFinished();
      composer.delta("Funcionou?");
    });

    expect(final).toBe("Encontrei um artigo.\n\nFuncionou?");
  });
});
