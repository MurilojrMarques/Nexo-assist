import { describe, expect, it } from "vitest";
import { getInitials } from "./get-initials";

describe("getInitials", () => {
  it.each([
    ["Ana Souza", "AS"],
    ["ana maria souza", "AS"],
    ["  Bruno   Lima  ", "BL"],
    ["Carla", "C"],
    ["", ""],
  ])("%j vira %j", (name, expected) => {
    expect(getInitials(name)).toBe(expected);
  });
});
