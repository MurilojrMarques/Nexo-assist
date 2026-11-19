import { describe, expect, it } from "vitest";
import { homePathFor } from "./home-path";

describe("homePathFor", () => {
  it("leva analistas ao console de conversas", () => {
    expect(homePathFor("rafael.lima@nexo.com.br")).toBe("/console");
  });

  it("leva os demais funcionários ao atendimento", () => {
    expect(homePathFor("ana.souza@nexo.com.br")).toBe("/chat");
  });
});
