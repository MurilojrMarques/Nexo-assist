import { describe, expect, it } from "vitest";
import { getScenario } from "./scenarios";

describe("getScenario", () => {
  it("abre o cenário pedido", () => {
    expect(getScenario("consulta").id).toBe("consulta");
  });

  it.each([undefined, "inexistente", ["consulta", "novo-chamado"]])(
    "cai no cenário de novo chamado com %j",
    (value) => {
      expect(getScenario(value).id).toBe("novo-chamado");
    },
  );
});
