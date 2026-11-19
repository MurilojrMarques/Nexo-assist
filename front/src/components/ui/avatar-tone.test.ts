import { describe, expect, it } from "vitest";
import { avatarTone, avatarTones } from "./avatar-tone";

describe("avatarTone", () => {
  it("sempre devolve a mesma cor para o mesmo nome", () => {
    expect(avatarTone("Carla Mendes")).toBe(avatarTone("Carla Mendes"));
  });

  it("usa uma das cores da paleta", () => {
    expect(avatarTones).toContain(avatarTone("Bruno Tavares"));
  });

  it("distribui nomes diferentes entre cores diferentes", () => {
    const names = ["Ana Souza", "Carla Mendes", "Bruno Tavares", "Diego Ramos", "Elisa Prado", "Fábio Nunes", "Gabriela Rocha"];
    const tones = new Set(names.map(avatarTone));

    expect(tones.size).toBeGreaterThan(1);
  });
});
