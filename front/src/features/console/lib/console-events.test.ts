import { describe, expect, it } from "vitest";
import type { ConsoleEvent } from "@/features/console/types";
import { describeEventInThread, describeEventOnTicket } from "./console-events";

const cases: [ConsoleEvent, string, string][] = [
  [{ type: "transfer", team: "Suporte N2", time: "10:05" }, "Transferida para Suporte N2 · 10:05", "Transferido para um analista"],
  [{ type: "assume", actor: "Rafael Lima", time: "10:12" }, "Rafael Lima assumiu · agent pausado · 10:12", "Assumido por Rafael Lima"],
  [{ type: "return", actor: "Rafael Lima", time: "10:20" }, "Rafael Lima devolveu ao agent · 10:20", "Devolvido ao agent"],
  [{ type: "close", actor: "Rafael Lima", time: "10:30" }, "Rafael Lima encerrou o atendimento · 10:30", "Encerrado por Rafael Lima"],
];

describe("console-events", () => {
  it.each(cases)("descreve %j na conversa e no chamado", (event, inThread, onTicket) => {
    expect(describeEventInThread(event)).toBe(inThread);
    expect(describeEventOnTicket(event)).toBe(onTicket);
  });
});
